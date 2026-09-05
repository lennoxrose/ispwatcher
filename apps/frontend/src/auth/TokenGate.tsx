import { useEffect, useState, type ReactNode } from "react";
import { apiFetch, getToken, setToken } from "../api/client.ts";

type Status = "checking" | "authenticated" | "unauthenticated";

export function TokenGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function checkStoredToken() {
    if (!getToken()) {
      setStatus("unauthenticated");
      return;
    }
    try {
      await apiFetch("/settings");
      setStatus("authenticated");
    } catch {
      setStatus("unauthenticated");
    }
  }

  useEffect(() => {
    void checkStoredToken();
    const onUnauthorized = () => setStatus("unauthenticated");
    window.addEventListener("api:unauthorized", onUnauthorized);
    return () => window.removeEventListener("api:unauthorized", onUnauthorized);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    setToken(input.trim());
    try {
      await apiFetch("/settings");
      setStatus("authenticated");
    } catch {
      setError("Token wurde abgelehnt. Bitte prüfen und erneut versuchen.");
      setStatus("unauthenticated");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "checking") {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Lädt…</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h1 className="mb-1 text-lg font-semibold text-gray-900">ISPwatcher</h1>
          <p className="mb-4 text-sm text-gray-500">API-Token eingeben, um fortzufahren.</p>
          <input
            type="password"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="API-Token"
            className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || input.trim().length === 0}
            className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Prüfe…" : "Anmelden"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
