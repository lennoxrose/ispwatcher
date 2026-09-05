import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { Measurement } from "../../generated/prisma/client.js";
import { campaignRepository } from "./campaign.repository.js";
import { CampaignStatus } from "./campaign.types.js";
import type {
  Campaign,
  CampaignEvaluation,
  CampaignWithDetails,
  CreateCampaignInput,
  LogMeasurementInput,
  MeasurementGate,
  UnderperformanceCriterion,
} from "./campaign.types.js";

const REQUIRED_MEASUREMENTS = 30;
const MAX_SPEED_RATIO = 0.9;
const NORMAL_SPEED_FAIL_RATIO = 0.1;
const DAYS_FAILED_THRESHOLD = 2;

// BNetzA campaign timing rules (plans.md §2) — enforced only as a gate on
// self-reported measurements, never anything measured automatically.
const MEASUREMENTS_PER_DAY = 10;
const MAX_CAMPAIGN_DAYS = 3;
const MIN_SPACING_MS = 5 * 60 * 1000;
const MID_DAY_GAP_MS = 3 * 60 * 60 * 1000;
const CAMPAIGN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

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

// A "day" is a distinct calendar date a measurement was logged on — the
// campaign's 3 days don't need to be consecutive, only within the 14-day
// window (plans.md §2), so this groups by date rather than by dayIndex.
function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function groupMeasurementsByDate(measurements: Measurement[]): Map<string, Measurement[]> {
  const byDate = new Map<string, Measurement[]>();
  for (const measurement of measurements) {
    const key = dateKey(measurement.timestamp);
    const list = byDate.get(key) ?? [];
    list.push(measurement);
    byDate.set(key, list);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  return byDate;
}

// Exported for direct unit testing — pure function, no time-mocking needed.
export function computeGate(campaign: CampaignWithDetails, now: Date): MeasurementGate {
  const byDate = groupMeasurementsByDate(campaign.measurements);
  const todayKey = dateKey(now);
  const todaysMeasurements = byDate.get(todayKey) ?? [];
  const progress = {
    totalLogged: campaign.measurements.length,
    daysUsed: byDate.size,
    todayLogged: todaysMeasurements.length,
  };

  if (campaign.status !== CampaignStatus.RUNNING) {
    return { allowed: false, reason: `Campaign is ${campaign.status}, not RUNNING`, progress };
  }

  if (campaign.startedAt) {
    const deadline = new Date(campaign.startedAt.getTime() + CAMPAIGN_WINDOW_MS);
    if (now > deadline) {
      return { allowed: false, reason: "The 14-day campaign window has expired", progress };
    }
  }

  const isNewDay = !byDate.has(todayKey);
  if (isNewDay) {
    if (byDate.size >= MAX_CAMPAIGN_DAYS) {
      return { allowed: false, reason: "All 3 measurement days have already been used", progress };
    }
    return { allowed: true, progress };
  }

  if (todaysMeasurements.length >= MEASUREMENTS_PER_DAY) {
    return { allowed: false, reason: "Already logged 10 measurements today", progress };
  }

  const last = todaysMeasurements[todaysMeasurements.length - 1];
  if (last) {
    const requiredGapMs = todaysMeasurements.length === 5 ? MID_DAY_GAP_MS : MIN_SPACING_MS;
    const sinceLastMs = now.getTime() - last.timestamp.getTime();
    if (sinceLastMs < requiredGapMs) {
      const reason =
        todaysMeasurements.length === 5
          ? "Must wait at least 3 hours after the 5th measurement of the day"
          : "Must wait at least 5 minutes since the last measurement";
      return {
        allowed: false,
        reason,
        nextAllowedAt: new Date(last.timestamp.getTime() + requiredGapMs),
        progress,
      };
    }
  }

  return { allowed: true, progress };
}

async function getCampaignWithDetailsOrThrow(campaignId: number): Promise<CampaignWithDetails> {
  const campaign = await campaignRepository.findByIdWithDetails(campaignId);
  if (!campaign) {
    throw new NotFoundError("Campaign", campaignId);
  }
  return campaign;
}

export async function getMeasurementGate(campaignId: number): Promise<MeasurementGate> {
  const campaign = await getCampaignWithDetailsOrThrow(campaignId);
  return computeGate(campaign, new Date());
}

export async function logMeasurement(
  campaignId: number,
  input: LogMeasurementInput,
): Promise<Measurement> {
  const campaign = await getCampaignWithDetailsOrThrow(campaignId);
  const now = new Date();
  const gate = computeGate(campaign, now);
  if (!gate.allowed) {
    throw new ConflictError(gate.reason ?? `Campaign ${campaignId} cannot accept a measurement right now`);
  }

  const byDate = groupMeasurementsByDate(campaign.measurements);
  const todayKey = dateKey(now);
  const sortedDayKeys = [...byDate.keys()].sort();
  const dayIndex = byDate.has(todayKey)
    ? sortedDayKeys.indexOf(todayKey) + 1
    : sortedDayKeys.length + 1;

  return campaignRepository.addMeasurement(campaignId, { ...input, dayIndex, timestamp: now });
}
