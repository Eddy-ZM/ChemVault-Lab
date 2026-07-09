import { analyseLabFiles } from "../analysis/pipeline";
import { requireSession, type LabSession } from "../auth/jwt";
import type { ChemVaultLabBindings } from "../db/bindings";
import type { AnalysisPipelineResult, AnalysisUserOptions, StoredAnalysisRecord } from "../files/types";
import type { LabAnalysis, ReactionRow } from "../schemas/labSchema";
import { getPersistedAnalysis, listPersistedHistory, persistAnalysis } from "../storage/serverStore";

type LabRecordsResult =
  | { error: Response; session: null; records: StoredAnalysisRecord[] }
  | { error: null; session: LabSession; records: StoredAnalysisRecord[] };

type LabRecordResult =
  | { error: Response; session: LabSession | null; record: null }
  | { error: null; session: LabSession; record: StoredAnalysisRecord };

type LabUploadResult =
  | { error: Response; session: LabSession | null; result: null }
  | { error: null; session: LabSession; result: AnalysisPipelineResult };

export async function requireLabRecords(request: Request, env: ChemVaultLabBindings): Promise<LabRecordsResult> {
  const session = await requireSession(request, env);
  if (!session) return { error: authError(), session: null, records: [] as StoredAnalysisRecord[] };
  return { error: null, session, records: await listPersistedHistory(env, session.sub) };
}

export async function requireLabRecord(request: Request, env: ChemVaultLabBindings, id: string): Promise<LabRecordResult> {
  const session = await requireSession(request, env);
  if (!session) return { error: authError(), session: null, record: null };
  const stored = await getPersistedAnalysis(env, id, session.sub);
  if (!stored) {
    return {
      error: Response.json({ error: "Lab analysis not found." }, { status: 404 }),
      session,
      record: null,
    };
  }
  return {
    error: null,
    session,
    record: {
      id: stored.id,
      date: stored.createdAt,
      experimentTitle: stored.analysis.experiment_summary.experiment_title || "Untitled experiment",
      fileCount: stored.fileCount,
      status: "complete",
      analysis: stored.analysis,
      markdown: stored.markdown,
      latex: stored.latex,
      excelFilename: stored.excelFilename,
      remoteDownloads: {
        xlsx: `/api/download/${stored.id}/xlsx`,
        json: `/api/download/${stored.id}/json`,
        markdown: `/api/download/${stored.id}/markdown`,
        latex: `/api/download/${stored.id}/latex`,
      },
    } satisfies StoredAnalysisRecord,
  };
}

export async function analyseCompatUpload(request: Request, env: ChemVaultLabBindings): Promise<LabUploadResult> {
  const session = await requireSession(request, env);
  if (!session) return { error: authError(), session: null, result: null };

  const form = await request.formData();
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  const singleFile = form.get("file");
  if (singleFile instanceof File) files.push(singleFile);
  if (files.length === 0) {
    return {
      error: Response.json({ error: "At least one file is required." }, { status: 400 }),
      session,
      result: null,
    };
  }

  const metadata = readAnalysisOptions(form);
  const result = await analyseLabFiles(files, metadata, {
    AI_PROVIDER: env.AI_PROVIDER,
    DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: env.DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL: env.DEEPSEEK_MODEL,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    AI: env.AI,
    OCR_PROVIDER: env.OCR_PROVIDER,
    OCR_API_KEY: env.OCR_API_KEY,
    OCR_ENDPOINT: env.OCR_ENDPOINT,
  });
  await persistAnalysis(env, result, files, session.sub);
  return { error: null, session, result };
}

export function toDocument(record: StoredAnalysisRecord, session?: LabSession | null) {
  return {
    id: record.id,
    projectId: defaultProjectId(session),
    filename: record.excelFilename,
    originalFilename: `${record.experimentTitle}.lab`,
    fileType: "lab-analysis",
    mimeType: "application/vnd.chemvault.lab+json",
    storageKey: `lab/analyses/${record.id}`,
    fileSizeBytes: JSON.stringify(record.analysis).length,
    status: "review_ready",
    createdAt: record.date,
    updatedAt: record.date,
    latestJob: toJob(record),
    labAnalysis: record.analysis,
    downloads: record.remoteDownloads,
  };
}

export function toUploadResponse(result: AnalysisPipelineResult, session?: LabSession | null) {
  const record = pipelineResultToRecord(result);
  return {
    document: toDocument(record, session),
    job: toJob(record),
    downloads: record.remoteDownloads,
  };
}

export function toBatchUploadResponse(result: AnalysisPipelineResult, session?: LabSession | null) {
  return {
    batchJobId: `lab-batch-${result.id}`,
    documents: result.fileCount,
    jobs: [toJob(pipelineResultToRecord(result))],
    document: toDocument(pipelineResultToRecord(result), session),
  };
}

export function toJob(record: StoredAnalysisRecord) {
  return {
    id: `lab-job-${record.id}`,
    documentId: record.id,
    jobType: "ai_extraction",
    status: "review_ready",
    error: null,
    createdAt: record.date,
    updatedAt: record.date,
  };
}

export function toReviewItems(record: StoredAnalysisRecord) {
  return [
    ...record.analysis.missing_data.map((item, index) => ({
      id: `${record.id}:missing:${index}`,
      documentId: record.id,
      recordType: "metadata",
      recordId: null,
      status: "needs_review",
      issueType: "missing_data",
      message: `${item.item}: ${item.why_it_matters}`,
      extractedData: {
        item: item.item,
        suggestedUserCheck: item.suggested_user_check,
        severity: item.severity,
      },
      evidence: null,
      confidence: severityConfidence(item.severity),
      createdAt: record.date,
      updatedAt: record.date,
    })),
    ...record.analysis.warnings.map((warning, index) => ({
      id: `${record.id}:warning:${index}`,
      documentId: record.id,
      recordType: "metadata",
      recordId: null,
      status: "needs_review",
      issueType: warning.type || "warning",
      message: warning.message,
      extractedData: {
        severity: warning.severity,
      },
      evidence: null,
      confidence: warning.severity === "high" ? 0.35 : warning.severity === "low" ? 0.75 : 0.55,
      createdAt: record.date,
      updatedAt: record.date,
    })),
  ];
}

export function toScientificDatabase(records: StoredAnalysisRecord[]) {
  return {
    chemicalEntities: records.flatMap((record) =>
      record.analysis.reaction_table.map((row, index) => toChemicalEntity(record, row, index)),
    ),
    reactions: records.map((record) => toReactionRecord(record)),
    measurements: records.flatMap((record) => toMeasurementRecords(record)),
  };
}

export function toSearchResponse(records: StoredAnalysisRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized ? records.filter((record) => searchableText(record).includes(normalized)) : records;
  const database = toScientificDatabase(filtered);
  return {
    documents: filtered.map((record) => ({
      id: record.id,
      projectId: defaultProjectId(null),
      filename: record.excelFilename,
      fileType: "lab-analysis",
      status: "review_ready",
    })),
    chunks: filtered.slice(0, 50).map((record) => ({
      id: `${record.id}:summary`,
      documentId: record.id,
      section: "Experiment Summary",
      pageStart: null,
      pageEnd: null,
      text: summaryPreview(record.analysis),
    })),
    records: [
      ...database.chemicalEntities.map((item) => ({
        id: item.id,
        documentId: item.documentId,
        recordType: "chemical_entity",
        label: item.normalizedName || item.rawName || "Chemical",
        reviewStatus: "pending",
        validationStatus: item.validationStatus,
        confidence: item.confidence,
        evidence: item.evidence,
        preview: [item.rawName, item.formula, item.role].filter(Boolean).join(" "),
      })),
      ...database.reactions.map((item) => ({
        id: item.id,
        documentId: item.documentId,
        recordType: "reaction",
        label: item.reactionName || "Reaction",
        reviewStatus: "pending",
        validationStatus: item.validationStatus,
        confidence: item.confidence,
        evidence: item.evidence,
        preview: item.yieldText || item.reactionName || "Reaction record",
      })),
      ...database.measurements.map((item) => ({
        id: item.id,
        documentId: item.documentId,
        recordType: "measurement",
        label: item.normalizedMeasurementType || item.measurementType,
        reviewStatus: "pending",
        validationStatus: item.validationStatus,
        confidence: item.confidence,
        evidence: item.evidence,
        preview: item.rawText || `${item.subject || ""} ${item.rawValue || ""} ${item.rawUnit || ""}`.trim(),
      })),
    ].slice(0, 100),
  };
}

export function toUsage(records: StoredAnalysisRecord[]) {
  const filesUsed = records.reduce((total, record) => total + record.fileCount, 0);
  const estimatedCostUsedUsd = 0;
  return {
    plan: "lab",
    filesUsed,
    filesLimit: 1000,
    estimatedCostUsedUsd,
    costLimitUsd: 0,
    remainingFiles: Math.max(0, 1000 - filesUsed),
    remainingCostUsd: 0,
    platformEstimatedCostUsedUsd: estimatedCostUsedUsd,
    ownKeyEstimatedCostUsedUsd: 0,
    projectsUsed: 1,
    projectsLimit: 1,
    documentsUsed: records.length,
    documentsLimit: 1000,
    storageUsedMb: Math.round((records.reduce((total, record) => total + JSON.stringify(record.analysis).length, 0) / 1024 / 1024) * 100) / 100,
    storageLimitMb: 1024,
    remainingStorageMb: 1024,
    canExport: true,
    canBatchExtract: true,
    recentRecords: records.slice(0, 20).map((record) => ({
      id: `usage-${record.id}`,
      userId: "chemvault-lab-user",
      projectId: defaultProjectId(null),
      workspaceId: null,
      batchJobId: null,
      documentId: record.id,
      extractionJobId: `lab-job-${record.id}`,
      provider: "chemvault-lab",
      model: "lab-pipeline",
      inputTokensEstimated: 0,
      outputTokensEstimated: 0,
      actualInputTokens: null,
      actualOutputTokens: null,
      estimatedCostUsd: 0,
      platformEstimatedCostUsd: 0,
      userPaidEstimatedCostUsd: 0,
      usedOwnApiKey: false,
      isUserProvidedApiKey: false,
      actualCostUsd: null,
      status: "completed",
      createdAt: record.date,
    })),
  };
}

export function toProject(session?: LabSession | null) {
  const now = new Date().toISOString();
  return {
    id: defaultProjectId(session),
    userId: session?.sub || "chemvault-lab-user",
    workspaceId: null,
    name: "ChemVault Lab Workspace",
    createdAt: now,
    updatedAt: now,
  };
}

export function toWorkspace(session?: LabSession | null) {
  const now = new Date().toISOString();
  return {
    id: defaultWorkspaceId(session),
    name: "ChemVault Lab",
    ownerUserId: session?.sub || "chemvault-lab-user",
    plan: "lab",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function jsonUnsupported(message = "This Extract API surface has moved into the ChemVault Lab workspace.") {
  return Response.json({ error: message, replacement: "Use ChemVault Lab routes under /api on lab.chemvault.science." }, { status: 410 });
}

function readAnalysisOptions(form: FormData): AnalysisUserOptions {
  const metadataRaw = String(form.get("metadata") || "{}");
  const parsed = parseMetadata(metadataRaw);
  return {
    uploadIntent: parsed.uploadIntent || "Auto detect",
    experimentName: parsed.experimentName || String(form.get("experimentName") || ""),
    courseName: parsed.courseName || String(form.get("courseName") || ""),
    experimentDate: parsed.experimentDate || String(form.get("experimentDate") || ""),
    operatorName: parsed.operatorName || String(form.get("operatorName") || ""),
    outputLanguage: parsed.outputLanguage || "English",
    generateExcel: parsed.generateExcel ?? true,
    generateJson: parsed.generateJson ?? true,
    generateMarkdown: parsed.generateMarkdown ?? true,
    generateLatex: parsed.generateLatex ?? true,
  };
}

function parseMetadata(metadataRaw: string): Partial<AnalysisUserOptions> {
  try {
    return JSON.parse(metadataRaw) as Partial<AnalysisUserOptions>;
  } catch {
    return {};
  }
}

function pipelineResultToRecord(result: AnalysisPipelineResult): StoredAnalysisRecord {
  return {
    id: result.id,
    date: result.createdAt,
    experimentTitle: result.analysis.experiment_summary.experiment_title || "Untitled experiment",
    fileCount: result.fileCount,
    status: "complete",
    analysis: result.analysis,
    markdown: result.markdown,
    latex: result.latex,
    excelFilename: result.excelFilename,
    remoteDownloads: {
      xlsx: `/api/download/${result.id}/xlsx`,
      json: `/api/download/${result.id}/json`,
      markdown: `/api/download/${result.id}/markdown`,
      latex: `/api/download/${result.id}/latex`,
    },
  };
}

function toChemicalEntity(record: StoredAnalysisRecord, row: ReactionRow, index: number) {
  return {
    id: `${record.id}:chemical:${index}`,
    documentId: record.id,
    rawName: row.chemical_name || null,
    normalizedName: row.chemical_name || null,
    name: row.chemical_name || null,
    formula: row.formula || null,
    normalizedFormula: row.formula || null,
    smiles: null,
    canonicalSmiles: null,
    inchi: null,
    inchiKey: null,
    cas: row.cas_number || null,
    rawAmount: row.mass !== null ? String(row.mass) : row.volume !== null ? String(row.volume) : null,
    normalizedAmount: row.moles !== null ? String(row.moles) : null,
    amount: row.mass !== null ? String(row.mass) : null,
    unit: row.mass_unit || row.volume_unit || null,
    normalizedUnit: row.moles !== null ? "mol" : null,
    role: row.role,
    normalizedRole: row.role,
    entityType: row.role,
    rawRole: row.role,
    validationStatus: row.notes ? "needs_review" : "pending",
    validationWarnings: row.notes ? [row.notes] : [],
    enrichmentStatus: "not_requested",
    enrichmentSource: null,
    pubchemCid: null,
    molecularWeight: row.molecular_weight,
    identifiers: { cas: row.cas_number || null },
    evidence: { quote: row.source_reference || row.notes || "" },
    confidence: record.analysis.experiment_summary.overall_confidence === "high" ? 0.85 : 0.55,
    createdAt: record.date,
    updatedAt: record.date,
  };
}

function toReactionRecord(record: StoredAnalysisRecord) {
  const analysis = record.analysis;
  return {
    id: `${record.id}:reaction`,
    documentId: record.id,
    reactionName: analysis.experiment_summary.detected_reaction || null,
    rawReactants: analysis.reaction_table.filter((row) => row.role === "reactant"),
    normalizedReactants: analysis.reaction_table.filter((row) => row.role === "reactant"),
    rawProducts: analysis.reaction_table.filter((row) => row.role === "product"),
    normalizedProducts: analysis.reaction_table.filter((row) => row.role === "product"),
    rawReagents: analysis.reaction_table.filter((row) => row.role === "reagent"),
    normalizedReagents: analysis.reaction_table.filter((row) => row.role === "reagent"),
    rawSolvents: analysis.reaction_table.filter((row) => row.role === "solvent"),
    normalizedSolvents: analysis.reaction_table.filter((row) => row.role === "solvent"),
    rawCatalysts: analysis.reaction_table.filter((row) => row.role === "catalyst"),
    normalizedCatalysts: analysis.reaction_table.filter((row) => row.role === "catalyst"),
    rawTemperature: analysis.procedure_timeline.find((step) => step.temperature)?.temperature || null,
    normalizedTemperature: null,
    rawTime: analysis.procedure_timeline.find((step) => step.time)?.time || null,
    normalizedTime: null,
    rawYieldValue: null,
    rawYieldUnit: null,
    normalizedYieldValue: null,
    normalizedYieldUnit: null,
    conditions: { experimentType: analysis.experiment_summary.experiment_type },
    yieldText: analysis.calculations.find((calculation) => /yield/i.test(calculation.name))?.notes || null,
    reactionId: `${record.id}:reaction`,
    evidence: { quote: analysis.experiment_summary.aim || analysis.experiment_summary.notes.join(" ") },
    confidence: confidenceNumber(analysis.experiment_summary.reaction_confidence),
    validationStatus: analysis.experiment_summary.reaction_confidence === "low" ? "needs_review" : "pending",
    validationWarnings: analysis.warnings,
    createdAt: record.date,
    updatedAt: record.date,
  };
}

function toMeasurementRecords(record: StoredAnalysisRecord) {
  const tableRecords = record.analysis.raw_data.tables.flatMap((table, tableIndex) =>
    table.rows.map((row, rowIndex) => ({
      id: `${record.id}:measurement:${tableIndex}:${rowIndex}`,
      documentId: record.id,
      measurementType: table.table_name || record.analysis.raw_data.data_type || "raw_data",
      normalizedMeasurementType: record.analysis.raw_data.data_type || table.table_name || "raw_data",
      subject: String(row.Sample || row.sample || row.Trial || row.trial || table.table_name || ""),
      rawValue: JSON.stringify(row),
      normalizedValue: null,
      rawUnit: null,
      normalizedUnit: null,
      rawText: JSON.stringify(row),
      rawConditions: { sourceReference: table.source_reference },
      normalizedConditions: null,
      conditions: { sourceReference: table.source_reference },
      evidence: { quote: table.source_reference || table.table_name },
      confidence: 0.7,
      validationStatus: "pending",
      validationWarnings: [],
      createdAt: record.date,
      updatedAt: record.date,
    })),
  );

  const calculationRecords = record.analysis.calculations.map((calculation, index) => ({
    id: `${record.id}:calculation:${index}`,
    documentId: record.id,
    measurementType: "calculation",
    normalizedMeasurementType: calculation.name,
    subject: calculation.name,
    rawValue: calculation.result === null ? null : String(calculation.result),
    normalizedValue: calculation.result === null ? null : String(calculation.result),
    rawUnit: calculation.unit || null,
    normalizedUnit: calculation.unit || null,
    rawText: calculation.formula,
    rawConditions: calculation.inputs,
    normalizedConditions: calculation.inputs,
    conditions: calculation.inputs,
    evidence: { quote: calculation.source_data || calculation.notes },
    confidence: confidenceNumber(calculation.confidence),
    validationStatus: calculation.calculation_status === "insufficient_data" ? "needs_review" : "pending",
    validationWarnings: calculation.notes ? [calculation.notes] : [],
    createdAt: record.date,
    updatedAt: record.date,
  }));

  return [...tableRecords, ...calculationRecords];
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
    ...analysis.raw_data.tables.map((table) => `${table.table_name} ${table.columns.join(" ")} ${JSON.stringify(table.rows)}`),
    ...analysis.warnings.map((warning) => `${warning.type} ${warning.message}`),
  ]
    .join(" ")
    .toLowerCase();
}

function summaryPreview(analysis: LabAnalysis) {
  return [
    analysis.experiment_summary.experiment_title,
    analysis.experiment_summary.experiment_type,
    analysis.experiment_summary.detected_reaction,
    analysis.experiment_summary.aim,
  ]
    .filter(Boolean)
    .join(" | ");
}

function authError() {
  return Response.json({ error: "Authentication required. Sign in with ChemVault User System through ChemVault Lab." }, { status: 401 });
}

function defaultProjectId(session?: LabSession | null) {
  return `lab-project-${(session?.sub || "default").replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

function defaultWorkspaceId(session?: LabSession | null) {
  return `lab-workspace-${(session?.sub || "default").replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

function confidenceNumber(confidence: string) {
  if (confidence === "high") return 0.85;
  if (confidence === "medium") return 0.6;
  if (confidence === "low") return 0.35;
  return null;
}

function severityConfidence(severity: string) {
  if (severity === "high") return 0.25;
  if (severity === "medium") return 0.5;
  return 0.75;
}
