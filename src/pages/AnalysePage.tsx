import { AlertTriangle, CheckCircle2, Circle, Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProgressTracker } from "../components/ProgressTracker";
import { UploadDropzone } from "../components/UploadDropzone";
import type { AnalysisStageStatus, AnalysisUserOptions, OutputLanguage, UploadIntent } from "../files/types";
import { runAnalysis } from "../services/analysisClient";
import { saveAnalysisToHistory } from "../storage/history";
import { visibleStageLabels } from "../analysis/stages";
import { enableGuestMode, fetchWithAuth, getStoredUser, hasGuestMode } from "../auth/client";
import { AuthChoiceDialog } from "../components/AuthChoiceDialog";
import { trackProductEvent } from "../analytics/client";

const uploadIntents: UploadIntent[] = [
  "Auto detect",
  "Includes handout",
  "No handout",
];

const languages: OutputLanguage[] = ["English", "Chinese", "bilingual"];

const outputFormats = [
  {
    key: "generateExcel",
    title: "Generate Excel",
    description: "Best for lab reports, spreadsheet review, calculations, and structured tables.",
  },
  {
    key: "generateJson",
    title: "Generate JSON",
    description: "Best for API workflows, debugging, and keeping the full stable schema.",
  },
  {
    key: "generateMarkdown",
    title: "Generate Markdown summary",
    description: "Best for quick notes, readable summaries, and copying into report drafts.",
  },
  {
    key: "generateLatex",
    title: "Generate LaTeX",
    description: "Best for formal writeups that start from a .tex report draft.",
  },
] as const;

export function AnalysePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const importAttempted = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [importingFile, setImportingFile] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [showAuthChoice, setShowAuthChoice] = useState(false);
  const [stages, setStages] = useState<AnalysisStageStatus[]>(visibleStageLabels);
  const [options, setOptions] = useState<AnalysisUserOptions>({
    uploadIntent: "Auto detect",
    experimentName: "",
    courseName: "",
    experimentDate: "",
    operatorName: "",
    outputLanguage: "English",
    generateExcel: true,
    generateJson: true,
    generateMarkdown: true,
    generateLatex: true,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fileId = params.get("filesFileId");
    if (!fileId || importAttempted.current) return;
    if (!getStoredUser()) {
      setError("Sign in to Lab to import this file from ChemVault Files.");
      setShowAuthChoice(true);
      return;
    }

    importAttempted.current = true;
    setImportingFile(true);
    setError("");
    trackProductEvent("files_import_started", { source: "files" });
    void fetchWithAuth(`/api/import/files/${encodeURIComponent(fileId)}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || `File import failed (${response.status}).`);
        }
        const blob = await response.blob();
        const suggestedName = params.get("fileName") || fileNameFromDisposition(response.headers.get("content-disposition"));
        setFiles((current) => [new File([blob], suggestedName || "chemvault-file", { type: blob.type }), ...current]);
        setOptions((current) => ({ ...current, sourceFileId: fileId }));
        trackProductEvent("files_import_completed", { source: "files", mimeType: blob.type || "unknown" });
      })
      .catch((caught) => {
        importAttempted.current = false;
        trackProductEvent("files_import_failed", { source: "files" });
        setError(caught instanceof Error ? caught.message : "File import failed.");
      })
      .finally(() => setImportingFile(false));
  }, [location.search]);

  async function submit({ allowAnonymous = false } = {}) {
    if (files.length === 0) {
      setError("Upload at least one file before starting analysis.");
      return;
    }
    if (!allowAnonymous && !getStoredUser() && !hasGuestMode()) {
      setError("");
      setShowAuthChoice(true);
      return;
    }
    setRunning(true);
    setError("");
    setShowAuthChoice(false);
    setStages(visibleStageLabels.map((stage, index) => ({ ...stage, status: index === 0 ? "running" : "pending" })));
    trackProductEvent("analysis_started", {
      fileCount: files.length,
      source: new URLSearchParams(location.search).get("source") || "direct",
    });

    try {
      const result = await runAnalysis(files, options);
      setStages(result.stages);
      saveAnalysisToHistory(result, result.remote);
      navigate(`/result/${result.id}`);
    } catch (caught) {
      trackProductEvent("analysis_failed", { fileCount: files.length });
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
      setStages((current) => current.map((stage) => (stage.status === "running" ? { ...stage, status: "error" } : stage)));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="analyse-page site-container">
      {running && <AnalysisLoadingOverlay stages={stages} fileCount={files.length} />}

      <section className="page-heading">
        <span className="eyebrow">Upload analysis</span>
        <h1>Extract structured data from lab records.</h1>
        <p>Upload related notebook, handout, and raw data files together. Unknown values remain Missing or null.</p>
      </section>

      <div className="analysis-layout">
        <form className="analysis-form" onSubmit={(event) => event.preventDefault()}>
          <UploadDropzone files={files} onFilesChange={setFiles} />
          {importingFile && <p className="form-note" role="status">Importing the selected ChemVault Files object…</p>}

          <fieldset>
            <legend>Handout handling</legend>
            <div className="segmented-row">
              {uploadIntents.map((intent) => (
                <button
                  className={options.uploadIntent === intent ? "is-selected" : ""}
                  type="button"
                  key={intent}
                  onClick={() => setOptions((current) => ({ ...current, uploadIntent: intent }))}
                >
                  {intent}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="form-grid">
            <label>
              Experiment name
              <input
                value={options.experimentName}
                onChange={(event) => setOptions((current) => ({ ...current, experimentName: event.target.value }))}
                placeholder="e.g. Aspirin synthesis"
              />
            </label>
            <label>
              Course name
              <input
                value={options.courseName}
                onChange={(event) => setOptions((current) => ({ ...current, courseName: event.target.value }))}
                placeholder="Organic Chemistry Lab"
              />
            </label>
            <label>
              Experiment date
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                value={options.experimentDate}
                onChange={(event) => setOptions((current) => ({ ...current, experimentDate: event.target.value }))}
                placeholder="YYYY-MM-DD"
              />
            </label>
            <label>
              Student/operator name
              <input
                value={options.operatorName}
                onChange={(event) => setOptions((current) => ({ ...current, operatorName: event.target.value }))}
                placeholder="Name"
              />
            </label>
          </div>

          <fieldset>
            <legend>Output language</legend>
            <div className="segmented-row">
              {languages.map((language) => (
                <button
                  className={options.outputLanguage === language ? "is-selected" : ""}
                  type="button"
                  key={language}
                  onClick={() => setOptions((current) => ({ ...current, outputLanguage: language }))}
                >
                  {language}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Outputs</legend>
            <div className="toggle-grid">
              {outputFormats.map((format) => (
                <label className="output-option" key={format.key}>
                  <input
                    type="checkbox"
                    checked={options[format.key]}
                    onChange={(event) =>
                      setOptions((current) => ({ ...current, [format.key]: event.target.checked }))
                    }
                  />
                  <span>
                    <strong>{format.title}</strong>
                    <small>{format.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="form-error">{error}</p>}

          {showAuthChoice && (
            <AuthChoiceDialog
              open={showAuthChoice}
              mode="panel"
              next={`${location.pathname}${location.search}`}
              onClose={() => setShowAuthChoice(false)}
              onContinueGuest={() => {
                enableGuestMode();
                void submit({ allowAnonymous: true });
              }}
            />
          )}

          <div className="form-actions">
            <button className="button primary" type="button" onClick={() => void submit()} disabled={running}>
              <Play size={17} />
              {running ? "Analysing" : "Start extraction"}
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setFiles([]);
                setOptions((current) => ({ ...current, sourceFileId: undefined }));
                setError("");
                setShowAuthChoice(false);
                setStages(visibleStageLabels);
              }}
              disabled={running}
            >
              <RotateCcw size={17} />
              Reset
            </button>
          </div>
        </form>

        <ProgressTracker stages={stages} />
      </div>
    </div>
  );
}

function fileNameFromDisposition(value: string | null): string | null {
  if (!value) return null;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  return value.match(/filename="?([^";]+)"?/i)?.[1] || null;
}

function AnalysisLoadingOverlay({ stages, fileCount }: { stages: AnalysisStageStatus[]; fileCount: number }) {
  const activeStage =
    stages.find((stage) => stage.status === "running") ||
    stages.find((stage) => stage.status === "pending") ||
    stages[stages.length - 1];

  return (
    <div className="analysis-loading-overlay" role="status" aria-live="polite" aria-label="Analysis in progress">
      <section className="analysis-loading-card" aria-busy="true">
        <div className="analysis-loading-hero">
          <span className="analysis-loading-spinner">
            <Loader2 size={30} />
          </span>
          <div>
            <span className="eyebrow">ChemVault Lab is working</span>
            <h2>Analysing uploaded lab records.</h2>
            <p>
              Processing {fileCount} file{fileCount === 1 ? "" : "s"}. Keep this window open while Lab extracts text,
              detects the experiment, and prepares the export files.
            </p>
          </div>
        </div>

        <div className="analysis-loading-current">
          <span>Current stage</span>
          <strong>{activeStage?.label || "Preparing analysis"}</strong>
          <small>{activeStage?.detail || activeStage?.status || "running"}</small>
        </div>

        <div className="progress-list analysis-loading-progress">
          {stages.map((stage) => (
            <div className={`progress-step ${stage.status}`} key={stage.key}>
              {loadingStatusIcon(stage.status)}
              <div>
                <strong>{stage.label}</strong>
                <span>{stage.detail || stage.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function loadingStatusIcon(status: AnalysisStageStatus["status"]) {
  if (status === "complete") return <CheckCircle2 size={18} />;
  if (status === "running") return <Loader2 size={18} className="spin" />;
  if (status === "warning" || status === "error") return <AlertTriangle size={18} />;
  return <Circle size={18} />;
}
