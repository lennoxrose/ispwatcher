import { useState } from "react";
import { Card } from "../../components/Card.tsx";
import { Button } from "../../components/Button.tsx";
import { formatDate, formatPercent } from "../../lib/formatters.ts";
import { useComplaint } from "./useComplaint.ts";

const BASIS_LABELS = {
  SELF_MONITORING_ONLY: "Informell (Eigenüberwachung)",
  OFFICIAL_PROTOCOL: "Formell (amtliches Messprotokoll)",
};

export function ComplaintReview({
  contractId,
  campaignId,
}: {
  contractId: number | undefined;
  campaignId: number | undefined;
}) {
  const { complaint, generateInformal, generateFormal, setReductionPercent, markSent, download } =
    useComplaint();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState("");

  if (contractId === undefined) {
    return <p className="text-sm text-gray-500">Zuerst einen Vertrag anlegen.</p>;
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Beschwerdebrief erzeugen">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => generateInformal(contractId))}
          >
            Informellen Brief erzeugen
          </Button>
          <Button
            disabled={busy || campaignId === undefined}
            onClick={() =>
              campaignId !== undefined && void run(() => generateFormal(contractId, campaignId))
            }
          >
            Formellen Brief erzeugen
          </Button>
        </div>
        {campaignId === undefined && (
          <p className="mt-2 text-xs text-gray-500">
            Für den formellen Brief wird eine laufende Kampagne mit hochgeladenem Messprotokoll
            benötigt.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      {complaint && (
        <Card title="Aktueller Entwurf">
          <dl className="mb-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Art</dt>
              <dd className="font-medium">{BASIS_LABELS[complaint.basis]}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Erzeugt am</dt>
              <dd className="font-medium">{formatDate(complaint.generatedAt)}</dd>
            </div>
            {complaint.claimedReductionPercent != null && (
              <div>
                <dt className="text-gray-500">Minderung</dt>
                <dd className="font-medium">
                  {formatPercent(complaint.claimedReductionPercent)} ({complaint.reductionPercentMode})
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Versendet</dt>
              <dd className="font-medium">
                {complaint.sentAt ? formatDate(complaint.sentAt) : "Noch nicht"}
              </dd>
            </div>
          </dl>

          {complaint.basis === "OFFICIAL_PROTOCOL" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <input
                type="number"
                step="0.1"
                placeholder="Minderung % manuell"
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                className="w-40 rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <Button
                variant="secondary"
                disabled={busy || manualValue === ""}
                onClick={() =>
                  void run(() =>
                    setReductionPercent({ mode: "MANUAL", value: Number(manualValue) }),
                  )
                }
              >
                Festlegen
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void run(() => setReductionPercent({ mode: "AUTO" }))}
              >
                Zurück auf Auto
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => void download()}>
              PDF ansehen
            </Button>
            {!complaint.sentAt && (
              <Button variant="secondary" disabled={busy} onClick={() => void run(markSent)}>
                Als versendet markieren
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
