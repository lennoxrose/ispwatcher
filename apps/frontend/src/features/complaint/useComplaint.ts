import { useState } from "react";
import { apiFetch, apiFetchBlob } from "../../api/client.ts";
import type { ComplaintDraft, SetReductionPercentInput } from "./complaint.types.ts";

// No list/history view — this app only ever shows the complaint you just
// generated in this session, matching "review before you send it" rather
// than an archive.
export function useComplaint() {
  const [complaint, setComplaint] = useState<ComplaintDraft | null>(null);

  async function generateInformal(contractId: number) {
    setComplaint(await apiFetch<ComplaintDraft>("/complaints", { method: "POST", body: { contractId } }));
  }

  async function generateFormal(contractId: number, campaignId: number) {
    setComplaint(
      await apiFetch<ComplaintDraft>("/complaints", {
        method: "POST",
        body: { contractId, campaignId },
      }),
    );
  }

  async function setReductionPercent(input: SetReductionPercentInput) {
    if (!complaint) {
      return;
    }
    setComplaint(
      await apiFetch<ComplaintDraft>(`/complaints/${complaint.id}/reduction-percent`, {
        method: "PATCH",
        body: input,
      }),
    );
  }

  async function markSent() {
    if (!complaint) {
      return;
    }
    setComplaint(await apiFetch<ComplaintDraft>(`/complaints/${complaint.id}/sent`, { method: "PATCH" }));
  }

  async function download() {
    if (!complaint) {
      return;
    }
    const blob = await apiFetchBlob(`/complaints/${complaint.id}/file`);
    window.open(URL.createObjectURL(blob), "_blank");
  }

  return { complaint, generateInformal, generateFormal, setReductionPercent, markSent, download };
}
