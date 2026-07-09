import { BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { StoredAnalysisRecord } from "../files/types";
import { loadWorkspaceRecords } from "../storage/workspaceRecords";

export function UsagePage() {
  const [records, setRecords] = useState<StoredAnalysisRecord[]>([]);

  useEffect(() => {
    void loadWorkspaceRecords().then((result) => setRecords(result.records));
  }, []);

  const usage = useMemo(() => {
    const downloads = records.length * 4;
    const issueCount = records.reduce((total, record) => total + record.analysis.missing_data.length + record.analysis.warnings.length, 0);
    const rawTables = records.reduce((total, record) => total + record.analysis.raw_data.tables.length, 0);
    const files = records.reduce((total, record) => total + record.fileCount, 0);
    return { downloads, issueCount, rawTables, files };
  }, [records]);

  return (
    <div className="site-container workspace-page">
      <section className="page-heading">
        <span className="eyebrow">Usage</span>
        <h1>Lab workspace activity.</h1>
        <p>Local usage visibility adapted from the old app, scoped to ChemVault Lab analyses.</p>
      </section>
      <section className="metrics-grid">
        <Metric label="Analyses" value={String(records.length)} />
        <Metric label="Source files" value={String(usage.files)} />
        <Metric label="Raw data tables" value={String(usage.rawTables)} />
        <Metric label="Potential downloads" value={String(usage.downloads)} />
      </section>
      <section className="data-section">
        <h2>
          <BarChart3 size={20} />
          Review workload
        </h2>
        <p>{usage.issueCount} missing data or warning items are currently visible across the workspace.</p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
