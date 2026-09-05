import type { ComplaintDraft as ComplaintDraftModel } from "../../generated/prisma/client.js";
import { ComplaintBasis, ReductionPercentMode } from "../../generated/prisma/client.js";

export type ComplaintDraft = ComplaintDraftModel;
export { ComplaintBasis, ReductionPercentMode };

export type GenerateComplaintInput = {
  contractId: number;
  campaignId?: number;
};

export type SetReductionPercentInput = { mode: "MANUAL"; value: number } | { mode: "AUTO" };
