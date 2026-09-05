import { useEffect, useState } from "react";
import { Card } from "../../components/Card.tsx";
import { Button } from "../../components/Button.tsx";
import { useSettings } from "./useSettings.ts";

export function SettingsForm() {
  const { settings, loading, error, updateIdentity, regenerateToken } = useSettings();
  const [senderName, setSenderName] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (settings) {
      setSenderName(settings.senderName);
      setSenderAddress(settings.senderAddress);
      setSenderCity(settings.senderCity);
    }
  }, [settings]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateIdentity({ senderName, senderAddress, senderCity });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!confirm("Neues Token erzeugen? Das alte Token funktioniert danach nicht mehr.")) {
      return;
    }
    setRegenerating(true);
    try {
      await regenerateToken();
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Lädt…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <Card title="Absenderdaten">
        <p className="mb-3 text-sm text-gray-500">
          Wird in erzeugten Beschwerdebriefen als Absender eingesetzt.
        </p>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              value={senderName}
              onChange={(event) => setSenderName(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Anschrift</label>
            <input
              value={senderAddress}
              onChange={(event) => setSenderAddress(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Straße, Hausnummer, PLZ Ort"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ort (für die Datumszeile)
            </label>
            <input
              value={senderCity}
              onChange={(event) => setSenderCity(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Speichert…" : "Speichern"}
            </Button>
            {saved && <span className="text-sm text-green-600">Gespeichert.</span>}
          </div>
        </form>
      </Card>

      <Card title="API-Token">
        <p className="mb-3 text-sm text-gray-500">
          Wird von dieser Oberfläche verwendet, um sich beim Backend zu authentifizieren.
        </p>
        <code className="mb-3 block break-all rounded bg-gray-100 px-3 py-2 text-sm">
          {settings?.apiToken}
        </code>
        <Button variant="danger" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? "Erzeugt…" : "Neues Token erzeugen"}
        </Button>
      </Card>
    </div>
  );
}
