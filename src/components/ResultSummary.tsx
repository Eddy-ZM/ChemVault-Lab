import { AlertTriangle, Download, FlaskConical, RefreshCw, Table2 } from "lucide-react";
import { Link } from "react-router-dom";
import { downloadAnalysisArtifact, downloadRemoteArtifact } from "../export/download";
import type { ArtifactFormat, StoredAnalysisRecord } from "../files/types";

interface ResultSummaryProps {
  record: StoredAnalysisRecord;
}

export function ResultSummary({ record }: ResultSummaryProps) {
  const analysis = record.analysis;
  const summary = analysis.experiment_summary;
  const workflowNote = summary.notes.find((note) => /workflow order/i.test(note));
  const sourceDiagnostics = analysis.warnings.filter((warning) =>
    ["ocr_required", "text_extraction", "schema_validation"].includes(warning.type),
  );

  return (
    <div className="result-stack">
      <section className="result-hero">
        <div>
          <span className="eyebrow">Analysis result</span>
          <h1>{summary.experiment_title || "Untitled experiment"}</h1>
          <p>
            {summary.experiment_type} with reaction confidence marked as {summary.reaction_confidence}.
          </p>
        </div>
        <div className="download-actions">
          <DownloadButton label="Excel" format="xlsx" record={record} />
          <DownloadButton label="JSON" format="json" record={record} />
          <DownloadButton label="Markdown" format="markdown" record={record} />
          <DownloadButton label="LaTeX" format="latex" record={record} />
        </div>
      </section>

      {sourceDiagnostics.length > 0 && (
        <section className="source-diagnostics-panel" aria-label="Source extraction diagnostics">
          <h2>
            <AlertTriangle size={20} />
            Source extraction needs attention
          </h2>
          <div className="diagnostic-help">
            <strong>What this means</strong>
            <p>
              If this result was opened from history, it may be an older saved analysis and will not be reprocessed
              automatically. Re-upload text-readable PDFs to run the current parser. Scanned notebook photos or image-only
              PDFs still need OCR before structured chemicals, steps, and raw tables can be extracted.
            </p>
            <div className="diagnostic-actions">
              <Link className="button primary" to="/analyse">
                <RefreshCw size={16} />
                Re-run analysis
              </Link>
              <Link className="button secondary" to="/documents">
                Manage saved records
              </Link>
            </div>
          </div>
          {sourceDiagnostics.map((warning) => (
            <div className="warning-row" key={`${warning.type}-${warning.message}`}>
              <strong>{formatWarningType(warning.type)}</strong>
              <p>{warning.message}</p>
              <span>{warning.severity}</span>
            </div>
          ))}
        </section>
      )}

      {workflowNote && (
        <section className="workflow-panel" aria-label="Detected experiment workflow">
          <span>Detected workflow</span>
          <strong>{workflowNote.replace(/^.*workflow order:\s*/i, "")}</strong>
        </section>
      )}

      <section className="metrics-grid">
        <Metric label="Detected experiment" value={summary.experiment_title || "Missing"} />
        <Metric label="Experiment type" value={summary.experiment_type} />
        <Metric label="Detected reaction" value={summary.detected_reaction || "Unknown"} />
        <Metric label="Confidence level" value={summary.overall_confidence} />
      </section>

      <section className="data-section">
        <h2>
          <FlaskConical size={20} />
          Extracted chemicals
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Chemical</th>
                <th>Mass</th>
                <th>Volume</th>
                <th>Moles</th>
                <th>Source</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {analysis.reaction_table.map((row, index) => (
                <tr key={`${row.chemical_name}-${index}`}>
                  <td>{row.role}</td>
                  <td>{row.chemical_name}</td>
                  <td>{formatValue(row.mass, row.mass_unit)}</td>
                  <td>{formatValue(row.volume, row.volume_unit)}</td>
                  <td>{formatValue(row.moles, "mol")}</td>
                  <td>{row.source_reference || "Missing"}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="two-column">
        <div className="data-section">
          <h2>Extracted procedure</h2>
          <ol className="procedure-list">
            {analysis.procedure_timeline.map((step) => (
              <li key={step.step_number}>
                <strong>{step.operation}</strong>
                <span>{[step.quantity, step.temperature, step.time, step.confidence].filter(Boolean).join(" | ")}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="data-section">
          <h2>Missing or uncertain data</h2>
          <div className="issue-list">
            {analysis.missing_data.length === 0 ? (
              <p>No critical missing data found in the MVP extraction.</p>
            ) : (
              analysis.missing_data.map((item) => (
                <article key={item.item}>
                  <strong>{item.item}</strong>
                  <p>{item.why_it_matters}</p>
                  <span>{item.suggested_user_check}</span>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="data-section">
        <h2>
          <Table2 size={20} />
          Extracted raw data
        </h2>
        {analysis.raw_data.tables.map((table) => (
          <div className="table-wrap" key={`${table.table_name}-${table.source_reference}`}>
            <h3>{table.table_name}</h3>
            <table>
              <thead>
                <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, table.columns.length)}>Missing</td>
                  </tr>
                ) : (
                  table.rows.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      {table.columns.map((column) => (
                        <td key={column}>{String(row[column] ?? "")}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="two-column">
        <div className="data-section">
          <h2>Calculations</h2>
          {analysis.calculations.map((calculation) => (
            <article className="calculation-row" key={calculation.name}>
              <strong>{calculation.name}</strong>
              <code>{calculation.formula}</code>
              <span>{calculation.calculation_status}</span>
            </article>
          ))}
        </div>
        <div className="data-section">
          <h2>Warnings</h2>
          {analysis.warnings.length === 0 ? (
            <p>No warnings recorded.</p>
          ) : (
            analysis.warnings.map((warning) => (
              <article className="warning-row" key={`${warning.type}-${warning.message}`}>
                <strong>{warning.type}</strong>
                <p>{warning.message}</p>
                <span>{warning.severity}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function DownloadButton({ label, format, record }: { label: string; format: ArtifactFormat; record: StoredAnalysisRecord }) {
  const remoteUrl = record.remoteDownloads?.[format];
  return (
    <button
      className="button secondary"
      type="button"
      onClick={() => {
        if (remoteUrl) {
          void downloadRemoteArtifact(remoteUrl, replaceExtension(record.excelFilename, format));
          return;
        }
        void downloadAnalysisArtifact(record.analysis, format);
      }}
    >
      <Download size={16} />
      {label}
    </button>
  );
}

function replaceExtension(filename: string, format: ArtifactFormat) {
  const extension = format === "xlsx" ? ".xlsx" : format === "json" ? ".json" : format === "markdown" ? ".md" : ".tex";
  return filename.replace(/\.xlsx$/, extension);
}

function formatWarningType(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value || "Missing"}</strong>
    </article>
  );
}

function formatValue(value: number | null, unit: string) {
  if (value === null) return "";
  return `${value}${unit ? ` ${unit}` : ""}`;
}
