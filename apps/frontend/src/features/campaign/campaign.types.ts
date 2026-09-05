export type CampaignStatus = "PENDING" | "RUNNING" | "COMPLETE" | "FAILED_INSUFFICIENT_DATA";

export type Campaign = {
  id: number;
  contractId: number;
  status: CampaignStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type MeasurementGate = {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: string;
  progress: {
    totalLogged: number;
    daysUsed: number;
    todayLogged: number;
  };
};

export type LogMeasurementInput = {
  downloadMbit: number;
  uploadMbit: number;
  pingMs: number;
};

export type UnderperformanceCriterion = "maxFail" | "normFail" | "minFail";

export type CampaignEvaluation = {
  underperforming: boolean;
  failedCriteria: UnderperformanceCriterion[];
};
