import { readFile } from "node:fs/promises";
import path from "node:path";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors.js";
import { writeDataFile } from "../../lib/file-storage.js";
import { renderHtmlToPdf } from "../../pdf/pdf-renderer.js";
import { contractRepository } from "../contract/contract.repository.js";
import type { Contract } from "../contract/contract.types.js";
import { campaignRepository } from "../campaign/campaign.repository.js";
import * as campaignService from "../campaign/campaign.service.js";
import type { CampaignWithDetails, UnderperformanceCriterion } from "../campaign/campaign.types.js";
import * as monitoringService from "../monitoring/monitoring.service.js";
import { protocolRepository } from "../protocol/protocol.repository.js";
import { complaintRepository } from "./complaint.repository.js";
import { ComplaintBasis, ReductionPercentMode } from "./complaint.types.js";
import type { ComplaintDraft, GenerateComplaintInput, SetReductionPercentInput } from "./complaint.types.js";

const TEMPLATES_DIR = path.join(import.meta.dirname, "../../pdf/templates");

const CRITERION_LABELS: Record<UnderperformanceCriterion, string> = {
  maxFail:
    "Die maximale Geschwindigkeit wurde an mindestens 2 von 3 Messtagen nicht zu mindestens 90 % erreicht.",
  normFail:
    "Die normalerweise zur Verfügung stehende Geschwindigkeit wurde bei mehr als 10 % aller Messungen unterschritten.",
  minFail: "Die Mindestgeschwindigkeit wurde an mindestens 2 von 3 Messtagen unterschritten.",
};

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

async function loadTemplate(filename: string): Promise<string> {
  return readFile(path.join(TEMPLATES_DIR, filename), "utf-8");
}

function formatGermanDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
}

// Not a legal formula — just "how far below the contracted normal speed did
// the campaign's own measurements average out to," as a starting suggestion
// per your instruction. Always overridable via setReductionPercent.
export function computeAutoReductionPercent(
  measurements: CampaignWithDetails["measurements"],
  contract: Contract,
): number {
  if (measurements.length === 0) {
    return 0;
  }
  const shortfalls = measurements.map((measurement) =>
    Math.max(0, (contract.normalSpeedMbit - measurement.downloadMbit) / contract.normalSpeedMbit),
  );
  const average = shortfalls.reduce((sum, value) => sum + value, 0) / shortfalls.length;
  return Math.round(average * 1000) / 10;
}

export async function getComplaint(id: number): Promise<ComplaintDraft> {
  const draft = await complaintRepository.findById(id);
  if (!draft) {
    throw new NotFoundError("ComplaintDraft", id);
  }
  return draft;
}

export async function getComplaintFile(id: number): Promise<Buffer> {
  const draft = await getComplaint(id);
  return readFile(draft.pdfPath);
}

export async function markSent(id: number): Promise<ComplaintDraft> {
  await getComplaint(id);
  return complaintRepository.update(id, { sentAt: new Date() });
}

export async function generateComplaint(input: GenerateComplaintInput): Promise<ComplaintDraft> {
  const contract = await contractRepository.findById(input.contractId);
  if (!contract) {
    throw new NotFoundError("Contract", input.contractId);
  }

  if (input.campaignId != null) {
    return generateFormalComplaint(contract, input.campaignId);
  }
  return generateInformalComplaint(contract);
}

// Sender identity (your own name/address) isn't captured anywhere in the
// schema yet — out of this plan's scope — so these are explicit fill-in
// placeholders in the generated PDF, not a gap in the logic.
const SENDER_PLACEHOLDERS = {
  SENDER_NAME: "[Ihr Name]",
  SENDER_ADDRESS: "[Ihre Anschrift]",
  SENDER_CITY: "[Ihr Ort]",
};

async function generateInformalComplaint(contract: Contract): Promise<ComplaintDraft> {
  const trend = await monitoringService.getTrendSummary(contract.id);
  const template = await loadTemplate("informal-complaint.html");
  const html = fillTemplate(template, {
    ...SENDER_PLACEHOLDERS,
    ISP_NAME: contract.ispName,
    ISP_ADDRESS: contract.ispAddress,
    DATE: formatGermanDate(new Date()),
    NORMAL_SPEED: String(contract.normalSpeedMbit),
    WINDOW_DAYS: String(trend.windowDays),
    BELOW_PERCENT: trend.belowContractPercent.toFixed(1),
    SAMPLE_SIZE: String(trend.sampleSize),
  });

  const pdfBuffer = await renderHtmlToPdf(html);
  const filePath = await writeDataFile(`complaints/contract-${contract.id}-informal.pdf`, pdfBuffer);

  const existing = await complaintRepository.findInformalByContractId(contract.id);
  const data = {
    contractId: contract.id,
    campaignId: null,
    basis: ComplaintBasis.SELF_MONITORING_ONLY,
    pdfPath: filePath,
    generatedAt: new Date(),
  };
  return existing
    ? complaintRepository.update(existing.id, data)
    : complaintRepository.create(data);
}

async function generateFormalComplaint(
  contract: Contract,
  campaignId: number,
): Promise<ComplaintDraft> {
  const campaign = await campaignRepository.findByIdWithDetails(campaignId);
  if (!campaign) {
    throw new NotFoundError("Campaign", campaignId);
  }
  if (campaign.contractId !== contract.id) {
    throw new ValidationError(`Campaign ${campaignId} does not belong to contract ${contract.id}`);
  }

  const protocol = await protocolRepository.findByCampaignId(campaignId);
  if (!protocol) {
    throw new ConflictError(
      `Upload the official BNetzA protocol for campaign ${campaignId} before generating a formal complaint`,
    );
  }

  const existing = await complaintRepository.findByCampaignId(campaignId);
  const mode = existing?.reductionPercentMode ?? ReductionPercentMode.AUTO;
  const claimedReductionPercent =
    mode === ReductionPercentMode.MANUAL && existing?.claimedReductionPercent != null
      ? existing.claimedReductionPercent
      : computeAutoReductionPercent(campaign.measurements, campaign.contract);

  // The official protocol (uploaded separately, attached by the user when
  // sending) is the actual proof regardless of whether all 30 measurements
  // were also self-reported into our tracker — don't block on that count.
  let failedCriteriaItems =
    "<li>Auswertung anhand der eigenen Messreihe noch nicht möglich (weniger als 30 Messungen selbst erfasst) — Grundlage ist das beigefügte amtliche Messprotokoll.</li>";
  if (campaign.measurements.length >= 30) {
    const evaluation = await campaignService.evaluateCampaign(campaignId);
    failedCriteriaItems = evaluation.failedCriteria
      .map((criterion) => `<li>${CRITERION_LABELS[criterion]}</li>`)
      .join("\n");
  }

  const template = await loadTemplate("formal-complaint.html");
  const html = fillTemplate(template, {
    ...SENDER_PLACEHOLDERS,
    ISP_NAME: contract.ispName,
    ISP_ADDRESS: contract.ispAddress,
    DATE: formatGermanDate(new Date()),
    CAMPAIGN_START: campaign.startedAt ? formatGermanDate(campaign.startedAt) : "[Startdatum]",
    CAMPAIGN_END: campaign.completedAt ? formatGermanDate(campaign.completedAt) : "[Enddatum]",
    MAX_SPEED: String(contract.maxSpeedMbit),
    NORMAL_SPEED: String(contract.normalSpeedMbit),
    MIN_SPEED: String(contract.minSpeedMbit),
    FAILED_CRITERIA_ITEMS: failedCriteriaItems,
    REDUCTION_PERCENT: claimedReductionPercent.toFixed(1),
  });

  const pdfBuffer = await renderHtmlToPdf(html);
  const filePath = await writeDataFile(`complaints/campaign-${campaignId}-formal.pdf`, pdfBuffer);

  const data = {
    contractId: contract.id,
    campaignId,
    basis: ComplaintBasis.OFFICIAL_PROTOCOL,
    pdfPath: filePath,
    generatedAt: new Date(),
    claimedReductionPercent,
    reductionPercentMode: mode,
  };
  return existing
    ? complaintRepository.update(existing.id, data)
    : complaintRepository.create(data);
}

export async function setReductionPercent(
  id: number,
  input: SetReductionPercentInput,
): Promise<ComplaintDraft> {
  const draft = await getComplaint(id);
  if (draft.campaignId == null) {
    throw new ValidationError("Reduction percent only applies to formal complaints");
  }

  if (input.mode === "MANUAL") {
    return complaintRepository.update(id, {
      reductionPercentMode: ReductionPercentMode.MANUAL,
      claimedReductionPercent: input.value,
    });
  }

  const campaign = await campaignRepository.findByIdWithDetails(draft.campaignId);
  if (!campaign) {
    throw new NotFoundError("Campaign", draft.campaignId);
  }
  return complaintRepository.update(id, {
    reductionPercentMode: ReductionPercentMode.AUTO,
    claimedReductionPercent: computeAutoReductionPercent(campaign.measurements, campaign.contract),
  });
}
