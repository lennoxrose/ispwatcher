import { useState } from "react";
import { TokenGate } from "./auth/TokenGate.tsx";
import { SettingsForm } from "./features/settings/SettingsForm.tsx";
import { ContractForm } from "./features/contract/ContractForm.tsx";
import { MonitoringDashboard } from "./features/monitoring/MonitoringDashboard.tsx";
import { CampaignProgress } from "./features/campaign/CampaignProgress.tsx";
import { ProtocolUpload } from "./features/protocol/ProtocolUpload.tsx";
import { ComplaintReview } from "./features/complaint/ComplaintReview.tsx";
import { useContract } from "./features/contract/useContract.ts";
import { useCampaign } from "./features/campaign/useCampaign.ts";

const TABS = ["Vertrag", "Überwachung", "Kampagne", "Beschwerde", "Einstellungen"] as const;
type Tab = (typeof TABS)[number];

function AppContent() {
  const [tab, setTab] = useState<Tab>("Vertrag");
  const { contract } = useContract();
  const { campaign } = useCampaign(contract?.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">ISPwatcher</h1>
      </header>
      <nav className="flex gap-1 border-b border-gray-200 bg-white px-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
      <main className="mx-auto max-w-3xl p-6">
        {tab === "Vertrag" && <ContractForm />}
        {tab === "Überwachung" && <MonitoringDashboard contractId={contract?.id} />}
        {tab === "Kampagne" && (
          <div className="space-y-4">
            <CampaignProgress contractId={contract?.id} />
            <ProtocolUpload campaignId={campaign?.id} />
          </div>
        )}
        {tab === "Beschwerde" && (
          <ComplaintReview contractId={contract?.id} campaignId={campaign?.id} />
        )}
        {tab === "Einstellungen" && <SettingsForm />}
      </main>
    </div>
  );
}

export function App() {
  return (
    <TokenGate>
      <AppContent />
    </TokenGate>
  );
}
