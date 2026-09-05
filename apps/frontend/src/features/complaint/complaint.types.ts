export type ComplaintBasis = "SELF_MONITORING_ONLY" | "OFFICIAL_PROTOCOL";
export type ReductionPercentMode = "AUTO" | "MANUAL";

export type ComplaintDraft = {
  id: number;
  contractId: number;
  campaignId: number | null;
  basis: ComplaintBasis;
  pdfPath: string;
  generatedAt: string;
  sentAt: string | null;
  claimedReductionPercent: number | null;
  reductionPercentMode: ReductionPercentMode;
};

export type SetReductionPercentInput = { mode: "MANUAL"; value: number } | { mode: "AUTO" };
