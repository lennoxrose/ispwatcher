import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api/client.ts";
import type { MonitoringDashboard } from "./monitoring.types.ts";

export function useMonitoring(contractId: number | undefined) {
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
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
      setDashboard(await apiFetch<MonitoringDashboard>(`/monitoring/${contractId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { dashboard, loading, error, reload };
}
