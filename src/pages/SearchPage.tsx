import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { StoredAnalysisRecord } from "../files/types";
import { loadWorkspaceRecords } from "../storage/workspaceRecords";

export function SearchPage() {
  const [records, setRecords] = useState<StoredAnalysisRecord[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadWorkspaceRecords().then((result) => setRecords(result.records));
  }, []);

  const results = useMemo(() => searchRecords(records, query), [records, query]);

  return (
    <div className="site-container workspace-page">
      <section className="page-heading">
        <span className="eyebrow">Search</span>
        <h1>Search lab experiments.</h1>
        <p>Find extracted lab records by experiment, reaction, chemical, observation, warning, or raw data value.</p>
      </section>

      <label className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search aspirin, HPLC, titre, ethanol..." />
      </label>

      <section className="search-results">
        {results.length === 0 ? (
          <div className="empty-state compact">
            <Search size={28} />
            <h2>{query ? "No matching analyses." : "Enter a term to search."}</h2>
          </div>
        ) : (
          results.map((record) => (
            <Link className="search-result-card" to={`/result/${record.id}`} key={record.id}>
              <strong>{record.experimentTitle}</strong>
              <span>{record.analysis.experiment_summary.experiment_type}</span>
              <p>{record.analysis.experiment_summary.detected_reaction || "Unknown reaction"}</p>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

function searchRecords(records: StoredAnalysisRecord[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return records.slice(0, 8);
  return records.filter((record) => searchableText(record).includes(needle));
}

function searchableText(record: StoredAnalysisRecord) {
  const analysis = record.analysis;
  return [
    record.experimentTitle,
    analysis.experiment_summary.experiment_type,
    analysis.experiment_summary.detected_reaction,
    analysis.experiment_summary.aim,
    ...analysis.reaction_table.map((row) => `${row.role} ${row.chemical_name} ${row.formula} ${row.notes}`),
    ...analysis.procedure_timeline.map((step) => `${step.operation} ${step.observation} ${step.materials.join(" ")}`),
    ...analysis.observations.map((item) => item.observation),
    ...analysis.missing_data.map((item) => `${item.item} ${item.why_it_matters}`),
  ]
    .join(" ")
    .toLowerCase();
}
