import { useCallback, useEffect, useState } from "react";
import { apiFetch, setToken } from "../../api/client.ts";
import type { Settings, UpdateIdentityInput } from "./settings.types.ts";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await apiFetch<Settings>("/settings"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function updateIdentity(input: UpdateIdentityInput) {
    const updated = await apiFetch<Settings>("/settings", { method: "PATCH", body: input });
    setSettings(updated);
  }

  async function regenerateToken() {
    const updated = await apiFetch<Settings>("/settings/regenerate-token", { method: "POST" });
    // The old token this request was authenticated with is now dead — update
    // our own stored copy immediately so the current session keeps working.
    setToken(updated.apiToken);
    setSettings(updated);
    return updated.apiToken;
  }

  return { settings, loading, error, updateIdentity, regenerateToken, reload };
}
