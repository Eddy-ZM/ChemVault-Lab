import { Download, FileClock, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { downloadAnalysisArtifact } from "../export/download";
import { clearAnalysisHistory, listAnalysisHistory } from "../storage/history";
import { clearWorkspaceRecordCache, loadWorkspaceRecords } from "../storage/workspaceRecords";
import { useEffect, useState } from "react";

const deleteConfirmationText = "Comfirm";

export function HistoryPage() {
  const [records, setRecords] = useState(() => listAnalysisHistory());
  const [source, setSource] = useState<"local" | "remote">("local");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    void loadWorkspaceRecords().then((result) => {
      setRecords(result.records);
      setSource(result.source);
    });
  }, []);

  return (
    <div className="history-page site-container">
      <section className="page-heading history-heading">
        <div>
          <span className="eyebrow">Local history</span>
          <h1>Recent lab analyses.</h1>
          <p>
            {source === "remote"
              ? "Private history is loaded from the server for the signed-in workspace."
              : "Local fallback history is stored in this browser. Sign in to use private server history."}
          </p>
        </div>
        <button
          className="button secondary"
          type="button"
          onClick={() => setConfirmClear(true)}
          disabled={records.length === 0}
        >
          <Trash2 size={16} />
          Clear local cache
        </button>
      </section>

      {confirmClear && (
        <section className="delete-confirmation-panel" aria-label="Confirm local history clearing">
          <div>
            <span className="eyebrow danger-eyebrow">Clear local cache</span>
            <h2>Clear local analysis history?</h2>
            <p>
              This removes local browser history and cached remote summaries on this device. Type{" "}
              <strong>{deleteConfirmationText}</strong> to confirm.
            </p>
          </div>
          <div className="delete-confirmation-actions">
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={deleteConfirmationText}
              aria-label={`Type ${deleteConfirmationText} to confirm clearing local history`}
            />
            <button
              className="button danger"
              type="button"
              disabled={confirmation !== deleteConfirmationText}
              onClick={() => {
                clearAnalysisHistory();
                clearWorkspaceRecordCache();
                if (source === "local") setRecords([]);
                setConfirmClear(false);
                setConfirmation("");
              }}
            >
              <Trash2 size={16} />
              Clear
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setConfirmClear(false);
                setConfirmation("");
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {records.length === 0 ? (
        <section className="empty-state compact">
          <FileClock size={28} />
          <h2>No analysis history yet.</h2>
          <Link className="button primary" to="/analyse">
            Start extracting lab data
          </Link>
        </section>
      ) : (
        <section className="history-table table-wrap">
          <table>
            <thead>
              <tr>
                <th>Analysis ID</th>
                <th>Date</th>
                <th>Experiment title</th>
                <th>File count</th>
                <th>Status</th>
                <th>Download links</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <Link to={`/result/${record.id}`}>{record.id.slice(0, 8)}</Link>
                  </td>
                  <td>{new Date(record.date).toLocaleString()}</td>
                  <td>{record.experimentTitle}</td>
                  <td>{record.fileCount}</td>
                  <td>{record.status}</td>
                  <td>
                    <div className="inline-actions">
                      <button type="button" onClick={() => void downloadAnalysisArtifact(record.analysis, "xlsx")}>
                        <Download size={14} />
                        XLSX
                      </button>
                      <button type="button" onClick={() => void downloadAnalysisArtifact(record.analysis, "json")}>
                        JSON
                      </button>
                      <button type="button" onClick={() => void downloadAnalysisArtifact(record.analysis, "markdown")}>
                        MD
                      </button>
                      <button type="button" onClick={() => void downloadAnalysisArtifact(record.analysis, "latex")}>
                        TeX
                      </button>
                    </div>
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
