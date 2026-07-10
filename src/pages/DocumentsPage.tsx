import { FileText, Search, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { StoredAnalysisRecord } from "../files/types";
import { deleteWorkspaceRecord, loadWorkspaceRecords, type WorkspaceRecordSource } from "../storage/workspaceRecords";

const deleteConfirmationText = "Confirm";

export function DocumentsPage() {
  const [records, setRecords] = useState<StoredAnalysisRecord[]>([]);
  const [source, setSource] = useState<WorkspaceRecordSource>("local");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StoredAnalysisRecord | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void loadWorkspaceRecords().then((result) => {
      setRecords(result.records);
      setSource(result.source);
    });
  }, []);

  const visibleRecords = useMemo(() => searchRecords(records, query), [records, query]);

  async function confirmDelete() {
    if (!pendingDelete || confirmation !== deleteConfirmationText) return;

    setDeleting(true);
    setDeleteError("");
    try {
      await deleteWorkspaceRecord(pendingDelete.id, source);
      setRecords((current) => current.filter((record) => record.id !== pendingDelete.id));
      setPendingDelete(null);
      setConfirmation("");
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Could not delete this analysis.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="site-container workspace-page">
      <section className="page-heading workspace-heading">
        <div>
          <span className="eyebrow">Documents</span>
          <h1>Lab records, search, and source bundles.</h1>
          <p>
            Browse completed analyses, search extracted content, and remove records that should no longer stay in this
            workspace.
          </p>
        </div>
        <Link className="button primary" to="/analyse">
          <UploadCloud size={17} />
          Upload files
        </Link>
      </section>

      <label className="search-box document-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, reaction, experiment type, chemical, observation, or raw data..."
        />
      </label>

      {pendingDelete && (
        <section className="delete-confirmation-panel" aria-label="Confirm analysis deletion">
          <div>
            <span className="eyebrow danger-eyebrow">Delete analysis</span>
            <h2>{pendingDelete.experimentTitle}</h2>
            <p>
              This removes the saved analysis record and generated artifacts from the current {source === "remote" ? "server workspace" : "browser history"}.
              Type <strong>{deleteConfirmationText}</strong> to confirm deletion.
            </p>
            {deleteError && <p className="form-error">{deleteError}</p>}
          </div>
          <div className="delete-confirmation-actions">
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={deleteConfirmationText}
              aria-label={`Type ${deleteConfirmationText} to confirm deletion`}
            />
            <button
              className="button danger"
              type="button"
              disabled={confirmation !== deleteConfirmationText || deleting}
              onClick={() => void confirmDelete()}
            >
              <Trash2 size={16} />
              {deleting ? "Deleting" : "Delete"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={deleting}
              onClick={() => {
                setPendingDelete(null);
                setConfirmation("");
                setDeleteError("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {records.length === 0 ? (
        <section className="empty-state compact">
          <FileText size={28} />
          <h2>No documents yet.</h2>
          <Link className="button primary" to="/analyse">
            Start extraction
          </Link>
        </section>
      ) : visibleRecords.length === 0 ? (
        <section className="empty-state compact">
          <Search size={28} />
          <h2>No matching documents.</h2>
        </section>
      ) : (
        <section className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document set</th>
                <th>Experiment type</th>
                <th>Reaction</th>
                <th>Files</th>
                <th>Source</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <Link to={`/result/${record.id}`}>{record.experimentTitle}</Link>
                  </td>
                  <td>{record.analysis.experiment_summary.experiment_type}</td>
                  <td>{record.analysis.experiment_summary.detected_reaction || "Unknown"}</td>
                  <td>{record.fileCount}</td>
                  <td>{source === "remote" ? "User System" : "Local"}</td>
                  <td>{record.status}</td>
                  <td>
                    <button
                      className="table-action danger-action"
                      type="button"
                      onClick={() => {
                        setPendingDelete(record);
                        setConfirmation("");
                        setDeleteError("");
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function searchRecords(records: StoredAnalysisRecord[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return records;
  return records.filter((record) => searchableText(record).includes(needle));
}

function searchableText(record: StoredAnalysisRecord) {
  const analysis = record.analysis;
  return [
    record.id,
    record.experimentTitle,
    analysis.experiment_summary.experiment_type,
    analysis.experiment_summary.detected_reaction,
    analysis.experiment_summary.aim,
    ...analysis.reaction_table.map((row) => `${row.role} ${row.chemical_name} ${row.formula} ${row.notes}`),
    ...analysis.procedure_timeline.map((step) => `${step.operation} ${step.observation} ${step.materials.join(" ")}`),
    ...analysis.observations.map((item) => item.observation),
    ...analysis.missing_data.map((item) => `${item.item} ${item.why_it_matters}`),
    ...analysis.raw_data.tables.flatMap((table) => [
      table.table_name,
      table.columns.join(" "),
      ...table.rows.map((row) => Object.values(row).join(" ")),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}
