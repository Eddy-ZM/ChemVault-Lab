import { Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { downloadAnalysisArtifact, downloadRemoteArtifact } from "../export/download";
import type { ArtifactFormat, StoredAnalysisRecord } from "../files/types";
import { loadWorkspaceRecords } from "../storage/workspaceRecords";

export function ExportsPage() {
  const [records, setRecords] = useState<StoredAnalysisRecord[]>([]);

  useEffect(() => {
    void loadWorkspaceRecords().then((result) => setRecords(result.records));
  }, []);

  return (
    <div className="site-container workspace-page">
      <section className="page-heading">
        <span className="eyebrow">Exports</span>
        <h1>Excel, JSON, Markdown, and LaTeX outputs.</h1>
        <p>Download Lab-generated artifacts from one place, using the Lab workbook schema and filename convention.</p>
      </section>

      {records.length === 0 ? (
        <section className="empty-state compact">
          <FileSpreadsheet size={28} />
          <h2>No exports yet.</h2>
          <Link className="button primary" to="/analyse">
            Create analysis
          </Link>
        </section>
      ) : (
        <section className="export-grid">
          {records.map((record) => (
            <article className="export-card" key={record.id}>
              <div>
                <strong>{record.experimentTitle}</strong>
                <p>{record.excelFilename}</p>
              </div>
              <div className="inline-actions">
                <ExportButton record={record} format="xlsx" label="XLSX" />
                <ExportButton record={record} format="json" label="JSON" />
                <ExportButton record={record} format="markdown" label="MD" />
                <ExportButton record={record} format="latex" label="TEX" />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function ExportButton({ record, format, label }: { record: StoredAnalysisRecord; format: ArtifactFormat; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const remoteUrl = record.remoteDownloads?.[format];
        if (remoteUrl) {
          const filename = record.excelFilename.replace(/\.xlsx$/, format === "xlsx" ? ".xlsx" : format === "json" ? ".json" : format === "markdown" ? ".md" : ".tex");
          void downloadRemoteArtifact(remoteUrl, filename);
          return;
        }
        void downloadAnalysisArtifact(record.analysis, format);
      }}
    >
      <Download size={14} />
      {label}
    </button>
  );
}
