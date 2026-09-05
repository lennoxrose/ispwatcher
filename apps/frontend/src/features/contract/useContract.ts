import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api/client.ts";
import type { Contract, ContractInput } from "./contract.types.ts";

// Single-user tool: this app operates on one active contract, the first one
// the API knows about. No contract-switcher UI — matches plans.md's "Setup
// screen" (singular).
export function useContract() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const contracts = await apiFetch<Contract[]>("/contracts");
      setContract(contracts[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createContract(input: ContractInput) {
    const created = await apiFetch<Contract>("/contracts", { method: "POST", body: input });
    setContract(created);
  }

  async function updateContract(input: Partial<ContractInput>) {
    if (!contract) {
      return;
    }
    const updated = await apiFetch<Contract>(`/contracts/${contract.id}`, {
      method: "PATCH",
      body: input,
    });
    setContract(updated);
  }

  return { contract, loading, error, createContract, updateContract };
}
