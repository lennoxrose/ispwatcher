import { useRef, useState } from "react";
import { Card } from "../../components/Card.tsx";
import { Button } from "../../components/Button.tsx";
import { formatDate } from "../../lib/formatters.ts";
import { useProtocol } from "./useProtocol.ts";

export function ProtocolUpload({ campaignId }: { campaignId: number | undefined }) {
  const { status, loading, error, upload } = useProtocol(campaignId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (campaignId === undefined) {
    return null;
  }
  if (loading) {
    return <p className="text-sm text-gray-500">Lädt…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  async function handleUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      await upload(file);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card title="Amtliches Messprotokoll">
      <p className="mb-3 text-sm text-gray-500">
        Das signierte Messprotokoll aus der Desktop-App der Bundesnetzagentur — die eigentliche
        rechtliche Grundlage für eine formelle Beschwerde.
      </p>
      {status ? (
        <p className="mb-3 text-sm text-green-700">
          Hochgeladen am {formatDate(status.uploadedAt)}
        </p>
      ) : (
        <p className="mb-3 text-sm text-gray-500">Noch kein Protokoll hochgeladen.</p>
      )}
      <div className="flex items-center gap-3">
        <input ref={fileInput} type="file" accept="application/pdf" className="text-sm" />
        <Button onClick={() => void handleUpload()} disabled={uploading}>
          {uploading ? "Lädt hoch…" : status ? "Ersetzen" : "Hochladen"}
        </Button>
      </div>
      {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
    </Card>
  );
}
