import { NotFoundError } from "../../shared/errors.js";
import { contractRepository } from "../contract/contract.repository.js";
import { monitoringRepository } from "./monitoring.repository.js";
import type {
  MonitoringDashboard,
  MonitoringRun,
  RecordMonitoringRunInput,
  TrendSummary,
} from "./monitoring.types.js";

const DEFAULT_WINDOW_DAYS = 7;
const MIN_SAMPLE_SIZE = 20;
const SUSTAINED_UNDERPERFORMANCE_RATIO = 0.2; // >20% of the window's runs below contracted "normal" speed

const LAYER1_DISCLAIMER =
  "Documentation only — self-collected monitoring data, not the certified § 57 TKG measurement mechanism.";

export async function recordRun(input: RecordMonitoringRunInput): Promise<MonitoringRun> {
  return monitoringRepository.create(input);
}

export async function getTrendSummary(
  contractId: number,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Promise<TrendSummary> {
  const contract = await contractRepository.findById(contractId);
  if (!contract) {
    throw new NotFoundError("Contract", contractId);
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const runs = await monitoringRepository.findSince(contractId, since);

  const belowContractCount = runs.filter(
    (run) => run.downloadMbit < contract.normalSpeedMbit,
  ).length;
  const belowContractPercent = runs.length === 0 ? 0 : (belowContractCount / runs.length) * 100;
  const sustainedUnderperformance =
    runs.length >= MIN_SAMPLE_SIZE &&
    belowContractPercent / 100 > SUSTAINED_UNDERPERFORMANCE_RATIO;

  return {
    windowDays,
    sampleSize: runs.length,
    belowContractPercent,
    sustainedUnderperformance,
    disclaimer: LAYER1_DISCLAIMER,
  };
}

export async function getDashboard(
  contractId: number,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Promise<MonitoringDashboard> {
  const [recentRuns, trend] = await Promise.all([
    monitoringRepository.findRecent(contractId),
    getTrendSummary(contractId, windowDays),
  ]);
  return { recentRuns, trend };
}
