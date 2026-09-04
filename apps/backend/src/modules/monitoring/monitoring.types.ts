import type { MonitoringRun as MonitoringRunModel } from "../../generated/prisma/client.js";

export type MonitoringRun = MonitoringRunModel;

export type RecordMonitoringRunInput = {
  contractId: number;
  downloadMbit: number;
  uploadMbit: number;
  pingMs: number;
};

// LAYER 1 output — always documentation, never the § 57 TKG legal proof.
// `disclaimer` is a data-level guarantee of that, not just a code comment,
// per CLAUDE.md's "label estimates as estimates" rule.
export type TrendSummary = {
  windowDays: number;
  sampleSize: number;
  belowContractPercent: number;
  sustainedUnderperformance: boolean;
  disclaimer: string;
};

export type MonitoringDashboard = {
  recentRuns: MonitoringRun[];
  trend: TrendSummary;
};
