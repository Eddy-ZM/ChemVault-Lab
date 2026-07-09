import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FlaskConical,
  KeyRound,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

type InfoPageKind = "features" | "demo" | "use-cases" | "security" | "docs" | "contact" | "pricing" | "account" | "batch" | "workspace" | "developers";

const docs = {
  overview: {
    title: "ChemVault Lab documentation",
    description: "Guides for uploading lab records, running staged extraction, reviewing uncertainty, and exporting Excel workbooks.",
    sections: [
      ["Core workflow", "Upload notebook images, experiment handouts, PDFs, DOCX files, CSV/XLSX tables, or instrument exports. Lab converts them into parsed blocks, staged AI extraction, structured JSON, and Excel output."],
      ["Supported outputs", "Every analysis can produce an .xlsx workbook, JSON payload, Markdown summary, and LaTeX .tex report draft. Missing or uncertain values stay marked instead of being invented."],
      ["API base", "Use https://lab.chemvault.science/api for the merged Lab API. Older Extract routes return compatibility responses or clear migration messages."],
    ],
  },
  "getting-started": {
    title: "Getting started",
    description: "Run the first analysis from a lab notebook, handout, or raw data export.",
    sections: [
      ["Start an analysis", "Open Analyse, upload one or more supported files, choose whether the upload includes a handout or use automatic detection, then add optional experiment metadata."],
      ["Review results", "Open the result page to inspect detected experiment type, likely reaction, chemicals, procedure steps, raw data tables, calculations, warnings, and missing data."],
      ["Download files", "Use the result or Exports page to download Excel, JSON, Markdown, and LaTeX outputs for lab report preparation."],
    ],
  },
  "upload-documents": {
    title: "Uploading files",
    description: "Accepted formats and how Lab treats raw notebook and instrument data.",
    sections: [
      ["Formats", "PDF, DOCX, XLSX, CSV, PNG, JPG, JPEG, WEBP, TXT, ASC, JDX, and DX are accepted by the Lab upload flow."],
      ["Parsing behavior", "DOCX and spreadsheets are parsed directly. PDFs use text extraction first. Images and scanned handwriting are routed through the OCR adapter and may be marked low confidence."],
      ["Privacy", "Server-side history is scoped to the signed-in ChemVault User System identity when authentication is configured."],
    ],
  },
  "ai-extraction": {
    title: "AI extraction",
    description: "The Lab pipeline uses staged AI calls instead of one large all-purpose prompt.",
    sections: [
      ["Stages", "Document classification, experiment detection, reaction context, chemicals and conditions, raw data, calculations, structured JSON, and Excel generation are separate stages."],
      ["Providers", "DeepSeek is the default adapter for the current Lab build. The provider interface keeps room for OpenAI, local models, and other future adapters."],
      ["Accuracy rule", "If a value is not present in source files, it remains null or Missing and appears in Issues and Missing Data."],
    ],
  },
  "review-workflow": {
    title: "Review workflow",
    description: "Low-confidence and missing fields are made visible before users rely on the output.",
    sections: [
      ["Review queue", "The Review page lists missing data, warnings, and uncertainty across saved analyses."],
      ["Evidence", "Rows keep source references where available, including file, sheet, page, or extracted block notes."],
      ["No fabrication", "Unknown reactions, unclear handwritten values, and insufficient calculation inputs are explicitly marked."],
    ],
  },
  search: {
    title: "Search",
    description: "Find previous lab analyses by experiment, reaction, raw data, or chemical names.",
    sections: [
      ["Workspace search", "The Documents page searches saved Lab analyses and surfaces matching experiment summaries, chemicals, calculations, warnings, and raw data text."],
      ["Merged Extract behavior", "Legacy Extract search calls map into Lab records when the user is signed in."],
    ],
  },
  export: {
    title: "Export",
    description: "Download analysis outputs for lab report writing and downstream data review.",
    sections: [
      ["Excel workbook", "The workbook includes Experiment Summary, Reaction Table, Procedure Timeline, Raw Data, Calculations, Observations, and Issues and Missing Data."],
      ["Text exports", "JSON keeps the stable schema used by the API. Markdown gives a readable summary for reports or notes. LaTeX provides a .tex report draft for formal writeups."],
    ],
  },
  api: {
    title: "Developer API",
    description: "ChemVault Extract API surfaces are now merged into the Lab API namespace.",
    sections: [
      ["Base URL", "Use https://lab.chemvault.science/api."],
      ["Authentication", "The MVP uses ChemVault User System handoff or the local Lab access-code session in development."],
      ["Compatibility", "Core document, search, database, review, export, usage, project, workspace, and batch endpoints return Lab-shaped data. Removed billing, webhook, and developer-key surfaces return 410 with a migration message."],
    ],
  },
  security: {
    title: "Security",
    description: "Security choices for Lab file processing and AI extraction.",
    sections: [
      ["Secrets", "Provider keys and JWT secrets are read from environment variables and are not hardcoded."],
      ["Private uploads", "Uploaded files and generated outputs are not public assets. R2/D1 storage is scoped through the server API when configured."],
      ["Safety", "Hazards can be summarized for awareness, but Lab does not provide instructions for bypassing lab safety rules."],
    ],
  },
};

export function InfoPage({ kind }: { kind: InfoPageKind }) {
  if (kind === "features") return <FeaturesInfo />;
  if (kind === "demo") return <DemoInfo />;
  if (kind === "use-cases") return <UseCasesInfo />;
  if (kind === "security") return <SecurityInfo />;
  if (kind === "docs") return <DocsInfo />;
  if (kind === "contact") return <ContactInfo />;
  if (kind === "pricing") return <PricingInfo />;
  if (kind === "account") return <AccountInfo />;
  if (kind === "batch") return <BatchInfo />;
  if (kind === "workspace") return <WorkspaceInfo />;
  return <DevelopersInfo />;
}

function FeaturesInfo() {
  return (
    <InfoShell eyebrow="Features" title="A merged Lab workspace for notebook extraction, review, search, and export." description="ChemVault Lab keeps the useful Extract product surface, but focuses it on experimental notebooks, handouts, raw data files, and standard lab-report outputs.">
      <div className="info-grid four">
        <InfoCard icon={<UploadCloud />} title="Scientific file ingestion" body="Upload PDFs, DOCX handouts, spreadsheet tables, CSV files, instrument exports, and notebook images." tags={["PDF", "DOCX", "XLSX", "CSV", "Images"]} />
        <InfoCard icon={<FlaskConical />} title="Staged AI extraction" body="Classify documents, detect experiment type, infer reaction context, extract chemicals, and structure raw data." tags={["DeepSeek", "modular", "debuggable"]} />
        <InfoCard icon={<ShieldCheck />} title="Evidence and uncertainty" body="Keep confidence labels, source references, missing data, and warnings visible in the result." tags={["confidence", "source", "Missing"]} />
        <InfoCard icon={<FileSpreadsheet />} title="Excel workbook output" body="Generate a real .xlsx workbook with seven structured sheets and analysis-specific raw data tables." tags={["XLSX", "JSON", "Markdown", "TeX"]} />
        <InfoCard icon={<BookOpenCheck />} title="Review workflow" body="Review low-confidence extraction, missing values, warnings, and uncertain reactions before using the result." tags={["warnings", "issues", "review"]} />
        <InfoCard icon={<Search />} title="Document search and database view" body="Search saved analyses inside Documents by title, reaction, experiment type, chemicals, calculations, and raw data text." tags={["database", "records", "history"]} />
        <InfoCard icon={<Download />} title="Exports" body="Download Excel, JSON, Markdown, and LaTeX outputs from the result page or the merged export workspace." tags={["Excel", "JSON", "MD", "TeX"]} />
        <InfoCard icon={<Users />} title="User System handoff" body="Use ChemVault User System for identity while keeping Lab routing, APIs, and storage independent from Extract." tags={["auth", "workspace", "Lab"]} />
      </div>
    </InfoShell>
  );
}

function DemoInfo() {
  const sample = {
    experiment: "Titration of ethanoic acid",
    type: "Titration",
    reaction: "acid-base neutralisation",
    confidence: "medium",
    outputs: ["Experiment Summary", "Reaction Table", "Raw Data", "Calculations"],
  };

  return (
    <InfoShell eyebrow="Demo" title="Sample Lab workflow with clearly labelled example data." description="This page is a static preview. It does not call the AI provider and should not be treated as real extracted experimental data.">
      <div className="demo-layout">
        <div className="data-section">
          <h2>
            <UploadCloud size={20} />
            1. Upload
          </h2>
          {["notebook_photo.jpg", "titration_handout.pdf", "titre_table.xlsx"].map((file) => (
            <div className="demo-row" key={file}>
              <CheckCircle2 size={17} />
              <span>{file}</span>
            </div>
          ))}
        </div>
        <div className="data-section">
          <h2>
            <FlaskConical size={20} />
            2. Structured result
          </h2>
          <pre className="code-panel">{JSON.stringify(sample, null, 2)}</pre>
        </div>
        <div className="data-section">
          <h2>
            <AlertTriangle size={20} />
            3. Review flags
          </h2>
          <div className="issue-list">
            <article>
              <strong>Indicator endpoint colour unclear</strong>
              <span>Suggested user check: verify notebook observation before final report.</span>
            </article>
          </div>
        </div>
        <div className="data-section">
          <h2>
            <Download size={20} />
            4. Export
          </h2>
          <p>Download the generated workbook, schema JSON, Markdown summary, or LaTeX report draft from the result page.</p>
          <Link className="button primary" to="/analyse">
            Try an analysis
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </InfoShell>
  );
}

function UseCasesInfo() {
  return (
    <InfoShell eyebrow="Use cases" title="Built for teaching labs, analytical work, and early research data cleanup." description="The merged Lab product keeps Extract's scientific-data workflow but narrows the first release around completed experiments and lab-report preparation.">
      <div className="info-grid two">
        <UseCase title="Organic synthesis notebook" input="Notebook photos, synthesis handout, melting point or yield spreadsheet" output="Reaction table, procedure timeline, product/yield calculations, missing safety or mass entries" />
        <UseCase title="Titration lab report" input="Handwritten titres, course handout, CSV table" output="Trial table, average titre, concentration calculation, endpoint observations" />
        <UseCase title="HPLC calibration" input="CSV/XLSX peak tables and calibration notes" output="Retention times, peak areas, concentrations, calibration equation, uncertainty flags" />
        <UseCase title="UV-Vis or enzyme kinetics" input="Absorbance tables, time-course CSV, notebook notes" output="Wavelength/time tables, concentration or rate calculations, missing blank/control checks" />
        <UseCase title="TLC and purification" input="Notebook image, solvent system note, distance measurements" output="Rf table, solvent front, spot assignments, purification observations" />
        <UseCase title="Course lab archive" input="Mixed notebooks, handouts, and raw data files" output="Searchable local or authenticated history with Excel/JSON/Markdown/LaTeX downloads" />
      </div>
    </InfoShell>
  );
}

function SecurityInfo() {
  return (
    <InfoShell eyebrow="Security" title="Private lab files, explicit uncertainty, and environment-based secrets." description="ChemVault Lab avoids overstated compliance claims. The MVP focuses on practical file privacy, scoped sessions, clear AI provider boundaries, and honest extraction outputs.">
      <div className="info-grid three">
        <InfoCard icon={<Lock />} title="Private by default" body="Uploads and generated outputs are handled through API routes and storage bindings, not public static file paths." />
        <InfoCard icon={<KeyRound />} title="No hardcoded secrets" body="DeepSeek, OpenAI, OCR, storage, database, JWT, and app URLs are read from environment variables." />
        <InfoCard icon={<ShieldCheck />} title="User System identity" body="Lab can accept ChemVault User System handoff and issue its own Lab session for private history." />
        <InfoCard icon={<AlertTriangle />} title="No invented data" body="Unknown reactions and absent measurements remain unknown, null, or Missing with confidence notes." />
        <InfoCard icon={<FlaskConical />} title="Chemistry safety boundary" body="Hazard notes are organized for awareness; the app does not optimize dangerous operations or bypass lab rules." />
        <InfoCard icon={<Database />} title="Storage separation" body="Lab's routes, storage keys, and API compatibility layer are separate from the old Extract app." />
      </div>
    </InfoShell>
  );
}

function DocsInfo() {
  const { "*": wildcard } = useParams();
  const slug = normalizeDocsSlug(wildcard || "");
  const page = docs[slug as keyof typeof docs] || docs.overview;

  return (
    <InfoShell eyebrow="Docs" title={page.title} description={page.description}>
      <div className="docs-layout">
        <nav className="docs-nav" aria-label="Documentation pages">
          {Object.entries(docs).map(([key, item]) => (
            <Link key={key} to={key === "overview" ? "/docs" : `/docs/${key}`} className={key === slug ? "active" : ""}>
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="docs-sections">
          {page.sections.map(([title, body]) => (
            <article className="data-section" key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </InfoShell>
  );
}

function ContactInfo() {
  return (
    <InfoShell eyebrow="Contact" title="Contact ChemVault Lab about lab notebook extraction." description="Use this page as the Lab-branded replacement for the old Extract contact surface. The MVP endpoint accepts the request and returns a clear delivery status for integration testing.">
      <div className="contact-panel">
        <div className="data-section">
          <h2>
            <Mail size={20} />
            What to include
          </h2>
          <p>Describe the experiment type, file formats, target output, and whether you need teaching-lab, analytical, or research-team workflows.</p>
          <div className="settings-list">
            <span>Domain: lab.chemvault.science</span>
            <span>API: /api/contact</span>
            <span>Status: MVP intake endpoint, no public file sharing</span>
          </div>
        </div>
        <form className="analysis-form" onSubmit={(event) => void submitContact(event)}>
          <label>
            Name
            <input name="name" required placeholder="Lab operator" />
          </label>
          <label>
            Email
            <input name="email" type="email" required placeholder="name@example.com" />
          </label>
          <label>
            Message
            <textarea name="message" required rows={6} placeholder="Tell us what Lab should process." />
          </label>
          <button className="button primary" type="submit">
            Send message
          </button>
        </form>
      </div>
    </InfoShell>
  );
}

function PricingInfo() {
  const plans = [
    ["MVP", "$0", "Local and authenticated Lab analysis for first-stage testing.", ["Notebook/handout/raw data upload", "Excel/JSON/Markdown/LaTeX export", "DeepSeek provider adapter", "Local or D1/R2 history"]],
    ["Student", "Planned", "For coursework and lab report preparation.", ["Higher monthly analyses", "Course-level history", "Export bundles", "User System identity"]],
    ["Researcher", "Planned", "For repeated analytical and synthesis record cleanup.", ["Batch upload", "Review queue", "Search database", "Provider configuration"]],
    ["Lab", "Planned", "For shared teaching or research labs.", ["Team workspace", "Members and roles", "Storage controls", "Admin usage reporting"]],
  ];

  return (
    <InfoShell eyebrow="Pricing" title="Lab pricing is not enabled in the MVP." description="The old Extract billing pages are merged into Lab as placeholders. Stripe checkout and portal APIs intentionally return migration or disabled responses until billing is reintroduced.">
      <div className="pricing-grid">
        {plans.map(([name, price, description, features]) => (
          <article className="pricing-card" key={name as string}>
            <h2>{name}</h2>
            <strong>{price}</strong>
            <p>{description}</p>
            <div className="settings-list">
              {(features as string[]).map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </InfoShell>
  );
}

function AccountInfo() {
  return (
    <InfoShell eyebrow="Account" title="Account management now runs through ChemVault User System." description="Lab keeps its own session after User System verification, while account profile and identity are centralized in User System. Billing is not active in this MVP.">
      <div className="info-grid two">
        <InfoCard icon={<KeyRound />} title="Sign in" body="Use the settings panel or header login control to start User System handoff and return to Lab." />
        <InfoCard icon={<Lock />} title="Local fallback" body="Development can use LAB_ACCESS_CODE and JWT_SECRET for a local Lab session without exposing secrets in code." />
      </div>
      <div className="hero-actions">
        <Link className="button primary" to="/settings">
          Open settings
        </Link>
        <Link className="button secondary" to="/dashboard">
          Open workspace
        </Link>
      </div>
    </InfoShell>
  );
}

function BatchInfo() {
  return (
    <InfoShell eyebrow="Batch" title="Batch upload is folded into the Lab analysis flow." description="For the MVP, multiple-file upload on /analyse replaces the old Extract batch pages. Legacy batch APIs map to Lab records where possible.">
      <div className="info-grid three">
        <InfoCard icon={<UploadCloud />} title="Multiple files" body="Drop notebooks, handouts, and raw data files from the same experiment in one analysis." />
        <InfoCard icon={<Database />} title="Merged result" body="The pipeline combines parsed blocks and raw data into one structured Lab analysis record." />
        <InfoCard icon={<Download />} title="Single export bundle" body="Download Excel, JSON, Markdown, and LaTeX from the generated result." />
      </div>
      <Link className="button primary" to="/analyse">
        Start batch-style analysis
      </Link>
    </InfoShell>
  );
}

function WorkspaceInfo() {
  return (
    <InfoShell eyebrow="Workspace" title="Workspace management is simplified for the Lab MVP." description="The old Extract project and workspace routes are retained as Lab-branded entry points, while full team administration remains planned.">
      <div className="info-grid three">
        <InfoCard icon={<Database />} title="Documents" body="Saved analyses are available through Documents, History, and Dashboard." />
        <InfoCard icon={<Users />} title="Members" body="Team members and invitations are reserved for the next workspace phase." />
        <InfoCard icon={<Search />} title="Search" body="Search across local or authenticated Lab records from one workspace UI." />
      </div>
      <div className="hero-actions">
        <Link className="button primary" to="/dashboard">
          Open dashboard
        </Link>
        <Link className="button secondary" to="/documents">
          View documents
        </Link>
      </div>
    </InfoShell>
  );
}

function DevelopersInfo() {
  return (
    <InfoShell eyebrow="Developers" title="Developer surfaces are paused while Extract moves into Lab." description="Core API routes remain available under /api for upload, analysis, history, download, documents, search, exports, usage, and compatibility responses. API keys and webhooks are disabled in the MVP.">
      <div className="info-grid two">
        <InfoCard icon={<Database />} title="Merged API" body="Use https://lab.chemvault.science/api for the Lab API and compatibility endpoints." />
        <InfoCard icon={<AlertTriangle />} title="Disabled surfaces" body="Developer API keys, webhooks, and billing checkout return 410 until those Lab modules are implemented." />
      </div>
      <Link className="button primary" to="/docs/api">
        Read API notes
      </Link>
    </InfoShell>
  );
}

function InfoShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <div className="site-container info-page">
      <section className="page-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <div className="info-stack">{children}</div>
    </div>
  );
}

function InfoCard({ icon, title, body, tags = [] }: { icon: ReactNode; title: string; body: string; tags?: string[] }) {
  return (
    <article className="info-card">
      <span>{icon}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {tags.length > 0 ? (
        <div className="tag-list compact-tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function UseCase({ title, input, output }: { title: string; input: string; output: string }) {
  return (
    <article className="use-case-card">
      <h2>{title}</h2>
      <dl>
        <div>
          <dt>Input</dt>
          <dd>{input}</dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd>{output}</dd>
        </div>
      </dl>
    </article>
  );
}

function normalizeDocsSlug(slug: string) {
  if (!slug) return "overview";
  if (slug === "sdks" || slug === "sdks/python" || slug === "sdks/javascript") return "api";
  if (slug === "errors" || slug === "rate-limits" || slug === "self-hosting" || slug === "webhooks") return "api";
  return slug;
}

async function submitContact(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  form.reset();
  window.dispatchEvent(
    new CustomEvent("chemvault-lab-toast", {
      detail: response.ok ? "Contact request accepted." : "Contact request could not be submitted.",
    }),
  );
}
