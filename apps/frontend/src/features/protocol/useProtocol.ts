import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../api/client.ts";
import type { ProtocolStatus } from "./protocol.types.ts";

export function useProtocol(campaignId: number | undefined) {
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (campaignId === undefined) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStatus(await apiFetch<ProtocolStatus>(`/campaigns/${campaignId}/protocol`));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus(null);
      } else {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function upload(file: File) {
    if (campaignId === undefined) {
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    await apiFetch(`/campaigns/${campaignId}/protocol`, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
    await reload();
  }

  return { status, loading, error, upload };
}
