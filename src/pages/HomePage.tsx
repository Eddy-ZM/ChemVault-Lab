import { ArrowRight, ClipboardList, FileSpreadsheet, FlaskConical, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredUser } from "../auth/client";
import { AuthChoiceDialog } from "../components/AuthChoiceDialog";

export function HomePage() {
  const navigate = useNavigate();
  const [showAuthChoice, setShowAuthChoice] = useState(false);

  function startFromHome() {
    if (getStoredUser()) {
      navigate("/analyse");
      return;
    }
    setShowAuthChoice(true);
  }

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-background-video" aria-hidden="true">
          <img src="/assets/lab-notebook-hero.png" alt="" />
        </div>
        <div className="site-container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">ChemVault Lab</span>
            <h1>Lab notes to Excel, without the cleanup work.</h1>
            <p>
              Upload notebooks, handouts, and raw data. ChemVault Lab detects the experiment and builds a structured
              workbook for lab reports.
            </p>
            <div className="hero-capabilities" aria-label="Key capabilities">
              <span>Document detection</span>
              <span>Reaction tables</span>
              <span>Raw data cleanup</span>
              <span>XLSX and TeX export</span>
            </div>
            <div className="hero-actions">
              <button className="button primary" type="button" onClick={startFromHome}>
                Start extracting lab data
                <ArrowRight size={18} />
              </button>
              <Link className="button secondary hero-secondary" to="/dashboard">
                Open Lab workspace
              </Link>
            </div>
          </div>
          <div className="hero-output-panel" aria-label="Excel output preview">
            <strong>Generated workbook</strong>
            <span>Experiment Summary</span>
            <span>Reaction Table</span>
            <span>Raw Data</span>
            <span>Issues and Missing Data</span>
          </div>
        </div>
      </section>

      <section className="site-container workflow-grid" aria-label="Extraction workflow">
        <WorkflowCard icon={<UploadCloud />} title="Upload files" body="Notebook photos, PDFs, DOCX, spreadsheets, CSV, and images." />
        <WorkflowCard icon={<ClipboardList />} title="Detect context" body="Experiment type, handout intent, raw tables, and uncertainty." />
        <WorkflowCard icon={<FlaskConical />} title="Structure data" body="Chemicals, quantities, procedure steps, observations, and calculations." />
        <WorkflowCard icon={<FileSpreadsheet />} title="Export files" body="Clean XLSX, JSON, Markdown, and LaTeX outputs for review." />
      </section>

      <section className="site-container output-preview">
        <div>
          <span className="eyebrow">Output workbook</span>
          <h2>Structured sheets, ready to review.</h2>
          <p>
            Excel exports include summary, reaction table, procedure, raw data, calculations, observations, and missing
            data flags.
          </p>
        </div>
        <div className="sheet-preview" aria-label="Excel output sheets">
          {[
            "Experiment Summary",
            "Reaction Table",
            "Procedure Timeline",
            "Raw Data",
            "Calculations",
            "Observations",
            "Issues and Missing Data",
          ].map((sheet) => (
            <span key={sheet}>{sheet}</span>
          ))}
        </div>
      </section>

      <section className="site-container support-strip">
        <strong>Supported files</strong>
        <span>PDF</span>
        <span>DOCX</span>
        <span>XLSX</span>
        <span>CSV</span>
        <span>PNG</span>
        <span>JPG</span>
        <span>JPEG</span>
        <span>WEBP</span>
        <span>TXT</span>
        <span>ASC</span>
        <span>JDX</span>
        <span>DX</span>
      </section>

      <AuthChoiceDialog
        open={showAuthChoice}
        onClose={() => setShowAuthChoice(false)}
        next="/analyse"
      />
    </div>
  );
}

function WorkflowCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="workflow-card">
      <span>{icon}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}
