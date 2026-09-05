import type {
  Campaign as CampaignModel,
  Contract,
  Measurement,
} from "../../generated/prisma/client.js";
import { CampaignStatus } from "../../generated/prisma/client.js";

export type Campaign = CampaignModel;
export { CampaignStatus };

export type CreateCampaignInput = {
  contractId: number;
};

export type CampaignWithDetails = Campaign & {
  measurements: Measurement[];
  contract: Contract;
};

export type UnderperformanceCriterion = "maxFail" | "normFail" | "minFail";

export type CampaignEvaluation = {
  underperforming: boolean;
  failedCriteria: UnderperformanceCriterion[];
};

export type LogMeasurementInput = {
  downloadMbit: number;
  uploadMbit: number;
  pingMs: number;
};

// Result of checking the BNetzA timing rules (plans.md §2) against a
// campaign's existing measurements as of `now`. Read-only status when used
// via getMeasurementGate(); the same shape backs the throw reason when
// logMeasurement() rejects an out-of-turn measurement.
export type MeasurementGate = {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
  progress: {
    totalLogged: number;
    daysUsed: number;
    todayLogged: number;
  };
};
