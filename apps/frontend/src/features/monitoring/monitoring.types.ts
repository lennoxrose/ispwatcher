export type MonitoringRun = {
  id: number;
  contractId: number;
  timestamp: string;
  downloadMbit: number;
  uploadMbit: number;
  pingMs: number;
};

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
