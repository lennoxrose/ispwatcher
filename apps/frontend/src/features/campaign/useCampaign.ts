import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api/client.ts";
import type {
  Campaign,
  CampaignEvaluation,
  CampaignStatus,
  LogMeasurementInput,
  MeasurementGate,
} from "./campaign.types.ts";

// Single-user tool: shows the most recent campaign for the active contract,
// not a full campaign history/switcher.
export function useCampaign(contractId: number | undefined) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [gate, setGate] = useState<MeasurementGate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (contractId === undefined) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const all = await apiFetch<Campaign[]>("/campaigns");
      const current = all.find((c) => c.contractId === contractId) ?? null;
      setCampaign(current);
      if (current) {
        setGate(await apiFetch<MeasurementGate>(`/campaigns/${current.id}/gate`));
      } else {
        setGate(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function startCampaign() {
    if (contractId === undefined) {
      return;
    }
    const created = await apiFetch<Campaign>("/campaigns", { method: "POST", body: { contractId } });
    const started = await apiFetch<Campaign>(`/campaigns/${created.id}/status`, {
      method: "PATCH",
      body: { status: "RUNNING" satisfies CampaignStatus },
    });
    setCampaign(started);
    await reload();
  }

  async function setStatus(status: CampaignStatus) {
    if (!campaign) {
      return;
    }
    const updated = await apiFetch<Campaign>(`/campaigns/${campaign.id}/status`, {
      method: "PATCH",
      body: { status },
    });
    setCampaign(updated);
  }

  async function logMeasurement(input: LogMeasurementInput) {
    if (!campaign) {
      return;
    }
    await apiFetch(`/campaigns/${campaign.id}/measurements`, { method: "POST", body: input });
    await reload();
  }

  async function evaluate(): Promise<CampaignEvaluation> {
    if (!campaign) {
      throw new Error("No campaign");
    }
    return apiFetch<CampaignEvaluation>(`/campaigns/${campaign.id}/evaluate`);
  }

  return { campaign, gate, loading, error, startCampaign, setStatus, logMeasurement, evaluate, reload };
}
