import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResultSummary } from "../components/ResultSummary";
import type { StoredAnalysisRecord } from "../files/types";
import { findWorkspaceRecord, getCachedWorkspaceRecords } from "../storage/workspaceRecords";

export function ResultPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<StoredAnalysisRecord | null | undefined>(() =>
    id ? getCachedWorkspaceRecords().find((item) => item.id === id) : null,
  );

  useEffect(() => {
    if (!id) {
      setRecord(null);
      return;
    }
    void findWorkspaceRecord(id).then(setRecord);
  }, [id]);

  if (record === undefined) {
    return (
      <div className="site-container empty-state">
        <span className="eyebrow">Loading result</span>
        <h1>Opening Lab analysis.</h1>
        <p>Checking local and private workspace history.</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="site-container empty-state">
        <span className="eyebrow">Result not found</span>
        <h1>No local analysis record is available.</h1>
        <p>Run a new analysis or open a recent item from history.</p>
        <Link className="button primary" to="/analyse">
          <ArrowLeft size={17} />
          Back to analyse
        </Link>
      </div>
    );
  }

  return (
    <div className="site-container result-page">
      <ResultSummary record={record} />
    </div>
  );
}
