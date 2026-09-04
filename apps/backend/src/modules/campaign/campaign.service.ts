import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { campaignRepository } from "./campaign.repository.js";
import { CampaignStatus } from "./campaign.types.js";
import type {
  Campaign,
  CampaignEvaluation,
  CreateCampaignInput,
  UnderperformanceCriterion,
} from "./campaign.types.js";

const REQUIRED_MEASUREMENTS = 30;
const MAX_SPEED_RATIO = 0.9;
const NORMAL_SPEED_FAIL_RATIO = 0.1;
const DAYS_FAILED_THRESHOLD = 2;

const allowedTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.PENDING]: [CampaignStatus.RUNNING],
  [CampaignStatus.RUNNING]: [CampaignStatus.COMPLETE, CampaignStatus.FAILED_INSUFFICIENT_DATA],
  [CampaignStatus.COMPLETE]: [],
  [CampaignStatus.FAILED_INSUFFICIENT_DATA]: [],
};

export async function listCampaigns(): Promise<Campaign[]> {
  return campaignRepository.findAll();
}

export async function getCampaign(id: number): Promise<Campaign> {
  const campaign = await campaignRepository.findById(id);
  if (!campaign) {
    throw new NotFoundError("Campaign", id);
  }
  return campaign;
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return campaignRepository.create(input);
}

export async function transitionStatus(
  id: number,
  nextStatus: CampaignStatus,
): Promise<Campaign> {
  const campaign = await getCampaign(id);
  if (!allowedTransitions[campaign.status].includes(nextStatus)) {
    throw new ConflictError(
      `Cannot transition campaign ${id} from ${campaign.status} to ${nextStatus}`,
    );
  }
  const now = new Date();
  const data =
    nextStatus === CampaignStatus.RUNNING
      ? { status: nextStatus, startedAt: now }
      : { status: nextStatus, completedAt: now };
  return campaignRepository.updateStatus(id, data);
}

// § 57 TKG underperformance thresholds (plans.md §2/§6).
export async function evaluateCampaign(campaignId: number): Promise<CampaignEvaluation> {
  const campaign = await campaignRepository.findByIdWithDetails(campaignId);
  if (!campaign) {
    throw new NotFoundError("Campaign", campaignId);
  }
  if (campaign.measurements.length < REQUIRED_MEASUREMENTS) {
    throw new ConflictError(
      `Campaign ${campaignId} has ${campaign.measurements.length} measurements; ${REQUIRED_MEASUREMENTS} are required to evaluate`,
    );
  }

  const { maxSpeedMbit, normalSpeedMbit, minSpeedMbit } = campaign.contract;

  const speedsByDay = new Map<number, number[]>();
  for (const measurement of campaign.measurements) {
    const daySpeeds = speedsByDay.get(measurement.dayIndex) ?? [];
    daySpeeds.push(measurement.downloadMbit);
    speedsByDay.set(measurement.dayIndex, daySpeeds);
  }

  let daysBelowMax = 0;
  let daysBelowMin = 0;
  for (const daySpeeds of speedsByDay.values()) {
    if (Math.max(...daySpeeds) < MAX_SPEED_RATIO * maxSpeedMbit) {
      daysBelowMax++;
    }
    if (Math.min(...daySpeeds) < minSpeedMbit) {
      daysBelowMin++;
    }
  }

  const belowNormalCount = campaign.measurements.filter(
    (measurement) => measurement.downloadMbit < normalSpeedMbit,
  ).length;

  const maxFail = daysBelowMax >= DAYS_FAILED_THRESHOLD;
  const normFail = belowNormalCount / campaign.measurements.length > NORMAL_SPEED_FAIL_RATIO;
  const minFail = daysBelowMin >= DAYS_FAILED_THRESHOLD;

  const failedCriteria: UnderperformanceCriterion[] = [];
  if (maxFail) failedCriteria.push("maxFail");
  if (normFail) failedCriteria.push("normFail");
  if (minFail) failedCriteria.push("minFail");

  return { underperforming: failedCriteria.length > 0, failedCriteria };
}
