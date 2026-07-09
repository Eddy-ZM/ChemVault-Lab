import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { StoredAnalysisRecord } from "../files/types";
import { loadWorkspaceRecords } from "../storage/workspaceRecords";

interface ReviewItem {
  id: string;
  recordId: string;
  experimentTitle: string;
  label: string;
  detail: string;
  severity: string;
}

export function ReviewPage() {
  const [records, setRecords] = useState<StoredAnalysisRecord[]>([]);

  useEffect(() => {
    void loadWorkspaceRecords().then((result) => setRecords(result.records));
  }, []);

  const reviewItems = useMemo(() => buildReviewItems(records), [records]);

  return (
    <div className="site-container workspace-page">
      <section className="page-heading">
        <span className="eyebrow">Review queue</span>
        <h1>Missing data and warnings.</h1>
        <p>Lab keeps uncertain extraction output visible instead of turning it into invented data.</p>
      </section>

      {reviewItems.length === 0 ? (
        <section className="empty-state compact">
          <CheckCircle2 size={30} />
          <h2>No review items found.</h2>
          <p>Warnings and missing values will appear here after analyses are created.</p>
        </section>
      ) : (
        <section className="review-list">
          {reviewItems.map((item) => (
            <article className="review-item" key={item.id}>
              <div>
                <span className={`severity-pill ${item.severity}`}>{item.severity || "unknown"}</span>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
                <small>{item.experimentTitle}</small>
              </div>
              <Link className="button secondary compact" to={`/result/${item.recordId}`}>
                <AlertTriangle size={15} />
                Open
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function buildReviewItems(records: StoredAnalysisRecord[]): ReviewItem[] {
  return records.flatMap((record) => [
    ...record.analysis.missing_data.map((item, index) => ({
      id: `${record.id}-missing-${index}`,
      recordId: record.id,
      experimentTitle: record.experimentTitle,
      label: item.item || "Missing item",
      detail: `${item.why_it_matters} ${item.suggested_user_check}`.trim(),
      severity: item.severity,
    })),
    ...record.analysis.warnings.map((warning, index) => ({
      id: `${record.id}-warning-${index}`,
      recordId: record.id,
      experimentTitle: record.experimentTitle,
      label: warning.type || "Warning",
      detail: warning.message,
      severity: warning.severity,
    })),
  ]);
}
