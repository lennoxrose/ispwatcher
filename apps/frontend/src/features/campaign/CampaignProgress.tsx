import { useState } from "react";
import { Card } from "../../components/Card.tsx";
import { Button } from "../../components/Button.tsx";
import { ProgressBar } from "../../components/ProgressBar.tsx";
import { formatDate } from "../../lib/formatters.ts";
import { useCampaign } from "./useCampaign.ts";
import type { CampaignEvaluation } from "./campaign.types.ts";

const CRITERION_LABELS: Record<string, string> = {
  maxFail: "Maximalgeschwindigkeit an 2+ Tagen verfehlt",
  normFail: "Normalgeschwindigkeit bei >10% der Messungen verfehlt",
  minFail: "Mindestgeschwindigkeit an 2+ Tagen unterschritten",
};

export function CampaignProgress({ contractId }: { contractId: number | undefined }) {
  const { campaign, gate, loading, error, startCampaign, setStatus, logMeasurement, evaluate } =
    useCampaign(contractId);
  const [downloadMbit, setDownloadMbit] = useState("");
  const [uploadMbit, setUploadMbit] = useState("");
  const [pingMs, setPingMs] = useState("");
  const [logError, setLogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<CampaignEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  if (contractId === undefined) {
    return <p className="text-sm text-gray-500">Zuerst einen Vertrag anlegen.</p>;
  }
  if (loading) {
    return <p className="text-sm text-gray-500">Lädt…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!campaign) {
    return (
      <Card title="BNetzA-Messkampagne">
        <p className="mb-3 text-sm text-gray-500">
          Startet den Zeit-Tracker für die offizielle 30-Messungen-Kampagne. Die Messungen selbst
          führst du in der Desktop-App der Bundesnetzagentur durch — hier trägst du sie danach nur
          ein.
        </p>
        <Button onClick={() => void startCampaign()}>Kampagne starten</Button>
      </Card>
    );
  }

  async function handleLog(event: React.FormEvent) {
    event.preventDefault();
    setLogError(null);
    setSubmitting(true);
    try {
      await logMeasurement({
        downloadMbit: Number(downloadMbit),
        uploadMbit: Number(uploadMbit),
        pingMs: Number(pingMs),
      });
      setDownloadMbit("");
      setUploadMbit("");
      setPingMs("");
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Eintragen fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEvaluate() {
    setEvaluating(true);
    try {
      setEvaluation(await evaluate());
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Auswertung fehlgeschlagen");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title={`Kampagne — Status: ${campaign.status}`}>
        {gate && (
          <div className="mb-4">
            <p className="mb-1 text-sm text-gray-500">
              {gate.progress.totalLogged} / 30 Messungen · {gate.progress.daysUsed} / 3 Tage
            </p>
            <ProgressBar value={gate.progress.totalLogged} max={30} />
            <p className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Schätzung anhand eigener Eingaben — keine amtliche Feststellung.
            </p>
            {gate.allowed ? (
              <p className="mt-2 text-sm text-green-700">Nächste Messung jetzt erlaubt.</p>
            ) : (
              <p className="mt-2 text-sm text-gray-700">
                {gate.reason}
                {gate.nextAllowedAt && <> — nächste Messung ab {formatDate(gate.nextAllowedAt)}</>}
              </p>
            )}
          </div>
        )}

        {campaign.status === "RUNNING" && (
          <form onSubmit={handleLog} className="mb-4 grid grid-cols-3 gap-3">
            <input
              type="number"
              step="0.1"
              placeholder="Download Mbit/s"
              value={downloadMbit}
              onChange={(event) => setDownloadMbit(event.target.value)}
              required
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Upload Mbit/s"
              value={uploadMbit}
              onChange={(event) => setUploadMbit(event.target.value)}
              required
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="1"
              placeholder="Ping ms"
              value={pingMs}
              onChange={(event) => setPingMs(event.target.value)}
              required
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="col-span-3">
              <Button type="submit" disabled={submitting || !gate?.allowed}>
                {submitting ? "Trägt ein…" : "Messung eintragen"}
              </Button>
            </div>
          </form>
        )}

        {logError && <p className="mb-3 text-sm text-red-600">{logError}</p>}

        <div className="flex flex-wrap gap-3">
          {campaign.status === "RUNNING" && (
            <>
              <Button variant="secondary" onClick={() => void setStatus("COMPLETE")}>
                Als abgeschlossen markieren
              </Button>
              <Button
                variant="secondary"
                onClick={() => void setStatus("FAILED_INSUFFICIENT_DATA")}
              >
                Als nicht ausreichend markieren
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => void handleEvaluate()} disabled={evaluating}>
            {evaluating ? "Wertet aus…" : "Eigene Auswertung anzeigen"}
          </Button>
        </div>

        {evaluation && (
          <div className="mt-4 rounded border border-gray-200 p-3 text-sm">
            <p className="mb-1 font-medium">
              {evaluation.underperforming
                ? "Unterschreitung festgestellt (eigene Auswertung)"
                : "Keine Unterschreitung festgestellt (eigene Auswertung)"}
            </p>
            {evaluation.failedCriteria.length > 0 && (
              <ul className="list-inside list-disc text-gray-700">
                {evaluation.failedCriteria.map((criterion) => (
                  <li key={criterion}>{CRITERION_LABELS[criterion] ?? criterion}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
