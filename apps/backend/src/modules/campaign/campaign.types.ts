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
