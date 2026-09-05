import { useEffect, useState } from "react";
import { Card } from "../../components/Card.tsx";
import { Button } from "../../components/Button.tsx";
import { useContract } from "./useContract.ts";
import type { ContractInput } from "./contract.types.ts";

const EMPTY: ContractInput = {
  ispName: "",
  ispAddress: "",
  maxSpeedMbit: 0,
  normalSpeedMbit: 0,
  minSpeedMbit: 0,
};

export function ContractForm() {
  const { contract, loading, error, createContract, updateContract } = useContract();
  const [form, setForm] = useState<ContractInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (contract) {
      setForm({
        ispName: contract.ispName,
        ispAddress: contract.ispAddress,
        maxSpeedMbit: contract.maxSpeedMbit,
        normalSpeedMbit: contract.normalSpeedMbit,
        minSpeedMbit: contract.minSpeedMbit,
      });
    }
  }, [contract]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      if (contract) {
        await updateContract(form);
      } else {
        await createContract(form);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Lädt…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <Card title={contract ? "Vertragsdaten" : "Vertrag anlegen"}>
      <p className="mb-3 text-sm text-gray-500">
        Die drei vertraglich zugesicherten Geschwindigkeiten aus der Vertragszusammenfassung
        deines Anbieters.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Anbieter (Name)</label>
          <input
            value={form.ispName}
            onChange={(event) => setForm({ ...form, ispName: event.target.value })}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Anbieteranschrift
          </label>
          <input
            value={form.ispAddress}
            onChange={(event) => setForm({ ...form, ispAddress: event.target.value })}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Max (Mbit/s)</label>
            <input
              type="number"
              step="0.1"
              value={form.maxSpeedMbit}
              onChange={(event) => setForm({ ...form, maxSpeedMbit: Number(event.target.value) })}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Normal (Mbit/s)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.normalSpeedMbit}
              onChange={(event) =>
                setForm({ ...form, normalSpeedMbit: Number(event.target.value) })
              }
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Min (Mbit/s)</label>
            <input
              type="number"
              step="0.1"
              value={form.minSpeedMbit}
              onChange={(event) => setForm({ ...form, minSpeedMbit: Number(event.target.value) })}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichert…" : contract ? "Speichern" : "Anlegen"}
          </Button>
          {saved && <span className="text-sm text-green-600">Gespeichert.</span>}
        </div>
      </form>
    </Card>
  );
}
