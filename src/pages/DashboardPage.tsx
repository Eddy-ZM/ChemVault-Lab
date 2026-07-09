import { AlertTriangle, Database, Download, FileClock, FlaskConical, Search, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { StoredAnalysisRecord } from "../files/types";
import { loadWorkspaceRecords, type WorkspaceRecordSource } from "../storage/workspaceRecords";

export function DashboardPage() {
  const [records, setRecords] = useState<StoredAnalysisRecord[]>([]);
  const [source, setSource] = useState<WorkspaceRecordSource>("local");

  useEffect(() => {
    void loadWorkspaceRecords().then((result) => {
      setRecords(result.records);
      setSource(result.source);
    });
  }, []);

  const stats = useMemo(() => buildStats(records), [records]);

  return (
    <div className="site-container workspace-page">
      <section className="page-heading workspace-heading">
        <div>
          <span className="eyebrow">ChemVault Lab workspace</span>
          <h1>Lab notebook extraction dashboard.</h1>
          <p>
            A Lab-branded workspace that combines upload, document history, review, search, and export workflows from
            the older app surface.
          </p>
        </div>
        <Link className="button primary" to="/analyse">
          <UploadCloud size={17} />
          New analysis
        </Link>
      </section>

      <section className="metrics-grid">
        <Metric label="Analyses" value={String(records.length)} />
        <Metric label="Uploaded files" value={String(stats.fileCount)} />
        <Metric label="Review items" value={String(stats.reviewItems)} />
        <Metric label="Data source" value={source === "remote" ? "User System" : "Local"} />
      </section>

      <section className="workspace-action-grid">
        <ActionCard icon={<Database />} title="Documents" body="Browse analysed lab records and open result details." to="/documents" />
        <ActionCard icon={<AlertTriangle />} title="Review" body="Check missing values, warnings, and low-confidence fields." to="/review" />
        <ActionCard icon={<Search />} title="Search documents" body="Find experiments by title, reaction, type, raw data, or chemicals." to="/documents" />
        <ActionCard icon={<Download />} title="Exports" body="Download Excel, JSON, Markdown, and LaTeX outputs from one place." to="/exports" />
      </section>

      <section className="two-column">
        <div className="data-section">
          <h2>
            <FileClock size={20} />
            Recent analyses
          </h2>
          {records.length === 0 ? (
            <p>No lab analyses yet.</p>
          ) : (
            <div className="compact-list">
              {records.slice(0, 5).map((record) => (
                <Link key={record.id} to={`/result/${record.id}`}>
                  <strong>{record.experimentTitle}</strong>
                  <span>{record.analysis.experiment_summary.experiment_type}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="data-section">
          <h2>
            <FlaskConical size={20} />
            Experiment types
          </h2>
          {stats.experimentTypes.length === 0 ? (
            <p>Experiment type counts will appear after extraction.</p>
          ) : (
            <div className="tag-list">
              {stats.experimentTypes.map(([type, count]) => (
                <span key={type}>
                  {type} <strong>{count}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function buildStats(records: StoredAnalysisRecord[]) {
  const typeCounts = new Map<string, number>();
  let fileCount = 0;
  let reviewItems = 0;

  for (const record of records) {
    fileCount += record.fileCount;
    reviewItems += record.analysis.missing_data.length + record.analysis.warnings.length;
    const type = record.analysis.experiment_summary.experiment_type || "Unknown / uncertain";
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  return {
    fileCount,
    reviewItems,
    experimentTypes: [...typeCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8),
  };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ActionCard({ icon, title, body, to }: { icon: ReactNode; title: string; body: string; to: string }) {
  return (
    <Link className="workspace-action-card" to={to}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </Link>
  );
}
