import { Card } from "../../components/Card.tsx";
import { formatDate, formatMbit, formatPercent } from "../../lib/formatters.ts";
import { useMonitoring } from "./useMonitoring.ts";

export function MonitoringDashboard({ contractId }: { contractId: number | undefined }) {
  const { dashboard, loading, error } = useMonitoring(contractId);

  if (contractId === undefined) {
    return <p className="text-sm text-gray-500">Zuerst einen Vertrag anlegen.</p>;
  }
  if (loading) {
    return <p className="text-sm text-gray-500">Lädt…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!dashboard) {
    return null;
  }

  const { trend, recentRuns } = dashboard;

  return (
    <div className="space-y-4">
      <Card title="Trend (Layer 1 — Dauerüberwachung)">
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {trend.disclaimer}
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-gray-500">Zeitraum</dt>
            <dd className="font-medium">{trend.windowDays} Tage</dd>
          </div>
          <div>
            <dt className="text-gray-500">Messungen</dt>
            <dd className="font-medium">{trend.sampleSize}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Unter Normgeschwindigkeit</dt>
            <dd className="font-medium">{formatPercent(trend.belowContractPercent)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Auffälliges Muster</dt>
            <dd className={`font-medium ${trend.sustainedUnderperformance ? "text-red-600" : "text-green-600"}`}>
              {trend.sustainedUnderperformance ? "Ja" : "Nein"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Letzte Messungen">
        {recentRuns.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Messungen.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="pb-2">Zeitpunkt</th>
                <th className="pb-2">Download</th>
                <th className="pb-2">Upload</th>
                <th className="pb-2">Ping</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-t border-gray-100">
                  <td className="py-1">{formatDate(run.timestamp)}</td>
                  <td className="py-1">{formatMbit(run.downloadMbit)}</td>
                  <td className="py-1">{formatMbit(run.uploadMbit)}</td>
                  <td className="py-1">{run.pingMs.toFixed(0)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
