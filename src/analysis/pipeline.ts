import { createAIProvider } from "../ai/providers/factory";
import type { AIProvider, AIProviderEnv, AIStageName } from "../ai/providers/types";
import type { AnalysisPipelineResult, AnalysisStageStatus, AnalysisUserOptions, LabFileLike } from "../files/types";
import { parseLabFiles } from "../parsers";
import { createOcrProvider } from "../ocr/providers/factory";
import { generateExcelWorkbook, makeExcelFilename } from "../excel/workbook";
import { generateLatexSummary } from "../export/latex";
import { generateMarkdownSummary } from "../export/markdown";
import { confidenceLevels, experimentTypes, labAnalysisSchema, type LabAnalysis, type ParsedDocumentBlock } from "../schemas/labSchema";
import { visibleStageLabels } from "./stages";
import {
  buildBaseAnalysis,
  classifyDocuments,
  detectExperiment,
  detectReaction,
  extractChemicals,
  extractRawData,
  identifyCalculations,
} from "./heuristics";

const baseSystemPrompt = [
  "You are ChemVault Lab, a scientific document extraction engine for chemistry, biology, pharmaceutical, and analytical science lab records.",
  "Never invent experimental data. Use null, Missing, or unknown when evidence is absent.",
  "Mark uncertain handwriting, OCR gaps, and weak reaction evidence with low confidence.",
  "Do not provide advice to bypass lab safety rules or optimize hazardous operations.",
  "Return strict JSON only.",
].join(" ");

export async function analyseLabFiles(
  files: LabFileLike[],
  options: AnalysisUserOptions,
  env: AIProviderEnv = {},
): Promise<AnalysisPipelineResult> {
  const createdAt = new Date().toISOString();
  const stages = cloneStages();
  const provider = createAIProvider(env);

  updateStage(stages, "files_uploaded", "complete", `${files.length} file(s) received`);
  const parsedBlocks = await hydrateOcrBlocks(await parseLabFiles(files), files, env);
  const readableBlockCount = parsedBlocks.filter(hasReadableExtractedText).length;
  updateStage(
    stages,
    "text_extracted",
    readableBlockCount > 0 ? "complete" : "warning",
    `${readableBlockCount}/${parsedBlocks.length} block(s) with readable text`,
  );

  const classification = await runProviderStage(
    provider,
    "classify_uploaded_documents",
    parsedBlocks,
    "Classify each uploaded file as lab notebook, experiment handout, raw data, image requiring OCR, or mixed/unknown.",
    classifyDocuments(parsedBlocks),
  );
  updateStage(stages, "document_type_detected", "complete", `${classification.documents.length} document block(s) classified`);

  const experimentFallback = detectExperiment(parsedBlocks, options);
  const experiment = reconcileExperimentDetection(
    experimentFallback,
    await runProviderStage(
      provider,
      "detect_experiment",
      parsedBlocks,
      "Detect experiment title, experiment type, aim, and confidence. Use one allowed experiment type.",
      experimentFallback,
    ),
  );
  updateStage(stages, "experiment_detected", "complete", experiment.experiment_type);

  const reactionFallback = detectReaction(parsedBlocks, experiment.experiment_type);
  const reaction = normalizeReactionDetection(
    await runProviderStage(
      provider,
      "detect_reaction",
      parsedBlocks,
      "Detect reaction name, reaction class, confidence, alternative possibilities, and uncertainty reason.",
      reactionFallback,
    ),
    reactionFallback,
  );
  updateStage(stages, "reaction_detected", reaction.reaction_confidence === "low" ? "warning" : "complete", reaction.detected_reaction);

  let analysis = buildBaseAnalysis(parsedBlocks, options, experiment, reaction);

  const reactionTableFallback = extractChemicals(parsedBlocks);
  const chemicalStageRows = pickArrayStageResult(
    await runProviderStage(
      provider,
      "extract_chemicals",
      parsedBlocks,
      "Extract chemicals, quantities, roles, units, hazards if explicitly present, and source references. Do not infer absent quantities.",
      reactionTableFallback,
    ),
    ["reaction_table", "chemicals", "items", "rows"],
    reactionTableFallback,
  );
  analysis.reaction_table = chemicalStageRows.length > 0 ? chemicalStageRows : reactionTableFallback;
  const rawDataFallback = extractRawData(parsedBlocks, experiment.experiment_type);
  analysis.raw_data = pickRawDataStageResult(
    await runProviderStage(
      provider,
      "extract_raw_data",
      parsedBlocks,
      "Extract raw data tables from parsed tables and text evidence. Preserve original columns when possible.",
      rawDataFallback,
    ),
    rawDataFallback,
  );
  const calculationsFallback = identifyCalculations(analysis);
  analysis.calculations = pickArrayStageResult(
    await runProviderStage(
      provider,
      "identify_calculations",
      parsedBlocks,
      "Identify calculations needed for the detected experiment. Only calculate when all inputs are present.",
      calculationsFallback,
    ),
    ["calculations", "items", "rows"],
    calculationsFallback,
  );

  const preFinalAnalysis = analysis;
  analysis = pickAnalysisStageResult(await runProviderStage(
    provider,
    "generate_structured_json",
    parsedBlocks,
    "Generate the final stable ChemVault Lab JSON object using the exact schema requested by the product brief.",
    analysis,
  ), analysis);
  analysis = addSourceDiagnostics(
    reinforceDeterministicEvidence(sanitizeAnalysis(analysis, provider, preFinalAnalysis), parsedBlocks, options),
    parsedBlocks,
  );
  updateStage(stages, "data_structured", "complete", `${analysis.raw_data.tables.length} table(s), ${analysis.reaction_table.length} chemical row(s)`);

  const excelBuffer = options.generateExcel ? await generateExcelWorkbook(analysis) : undefined;
  const excelFilename = makeExcelFilename(analysis);
  updateStage(stages, "excel_generated", options.generateExcel ? "complete" : "warning", options.generateExcel ? excelFilename : "Excel generation disabled");

  return {
    id: createAnalysisId(),
    filenameSlug: slugify(analysis.experiment_summary.experiment_title || "experiment"),
    createdAt,
    fileCount: files.length,
    parsedBlocks,
    analysis,
    markdown: generateMarkdownSummary(analysis),
    latex: generateLatexSummary(analysis),
    excelFilename,
    excelBuffer,
    stages,
    provider: provider.name,
  };
}

async function hydrateOcrBlocks(blocks: ParsedDocumentBlock[], files: LabFileLike[], env: AIProviderEnv) {
  const ocrProvider = createOcrProvider(env);
  if (!ocrProvider.isConfigured() || ocrProvider.name === "basic-ocr-placeholder") return blocks;
  const nextBlocks = [...blocks];

  for (const block of blocks) {
    if (block.block_type !== "image_ocr") continue;
    const file = files.find((candidate) => candidate.name === block.source_file);
    if (!file) continue;
    const extracted = await ocrProvider.extract({
      fileName: file.name,
      mimeType: file.type,
      buffer: await file.arrayBuffer(),
    });
    const index = nextBlocks.indexOf(block);
    nextBlocks[index] = extracted;
  }

  return nextBlocks;
}

async function runProviderStage<T>(
  provider: AIProvider,
  stage: AIStageName,
  blocks: ParsedDocumentBlock[],
  instruction: string,
  fallback: T,
): Promise<T> {
  if (!provider.isConfigured()) return fallback;

  try {
    return await provider.completeJson<T>(
      {
        stage,
        system: baseSystemPrompt,
        user: JSON.stringify({
          stage,
          instruction,
          parsed_blocks: compactBlocks(blocks),
          fallback_shape: fallback,
        }),
      },
      fallback,
    );
  } catch {
    return fallback;
  }
}

function normalizeReactionDetection<T extends {
  detected_reaction: string;
  reaction_class: string;
  reaction_confidence: string;
  alternative_possibilities: string[];
  uncertainty_reason: string;
}>(value: T, fallback: T): T {
  if (fallback.detected_reaction === "Not a reaction-centred experiment") {
    return fallback;
  }
  const record = value && typeof value === "object" ? value : fallback;
  return {
    ...fallback,
    ...record,
    detected_reaction: typeof record.detected_reaction === "string" && record.detected_reaction
      ? record.detected_reaction
      : fallback.detected_reaction,
    reaction_class: typeof record.reaction_class === "string" && record.reaction_class
      ? record.reaction_class
      : fallback.reaction_class,
    reaction_confidence: (confidenceLevels as readonly string[]).includes(record.reaction_confidence)
      ? record.reaction_confidence
      : fallback.reaction_confidence,
    alternative_possibilities: Array.isArray(record.alternative_possibilities)
      ? record.alternative_possibilities.map(String)
      : fallback.alternative_possibilities,
    uncertainty_reason: typeof record.uncertainty_reason === "string" ? record.uncertainty_reason : fallback.uncertainty_reason,
  };
}

function sanitizeAnalysis(analysis: LabAnalysis, provider: AIProvider, fallback: LabAnalysis): LabAnalysis {
  const normalized = normalizeAnalysisShape(analysis, fallback);
  const parsed = labAnalysisSchema.safeParse(normalized);
  const valid = parsed.success ? parsed.data : buildFallbackFromInvalid(fallback);

  if (provider.name === "heuristic") {
    valid.warnings.push({
      type: "ai_provider",
      message:
        "Live AI provider was not configured or was disabled; ChemVault Lab used deterministic extraction only.",
      severity: "medium",
    });
  }

  for (const blockWarning of valid.experiment_summary.source_files.length === 0
    ? [{ type: "source", message: "No source files were recorded", severity: "high" }]
    : []) {
    valid.warnings.push(blockWarning);
  }

  return valid;
}

function normalizeAnalysisShape(analysis: LabAnalysis, fallback: LabAnalysis): LabAnalysis {
  const fallbackSummary = fallback.experiment_summary;
  const summary = analysis.experiment_summary || fallbackSummary;
  const experimentType = normalizeExperimentType(summary.experiment_type, fallbackSummary.experiment_type);
  const reactionConfidence = normalizeConfidence(summary.reaction_confidence, fallbackSummary.reaction_confidence);
  const overallConfidence = normalizeConfidence(summary.overall_confidence, fallbackSummary.overall_confidence);
  const detectedReaction =
    typeof summary.detected_reaction === "string" && summary.detected_reaction
      ? summary.detected_reaction
      : experimentType === "Unknown / uncertain"
        ? "Unknown"
        : "Not a reaction-centred experiment";

  return {
    ...fallback,
    ...analysis,
    experiment_summary: {
      ...fallbackSummary,
      ...summary,
      experiment_title: String(summary.experiment_title || fallbackSummary.experiment_title || "Untitled experiment"),
      experiment_type: experimentType,
      detected_reaction: detectedReaction,
      reaction_confidence: reactionConfidence,
      aim: String(summary.aim || fallbackSummary.aim || "Missing"),
      date: String(summary.date || fallbackSummary.date || ""),
      course: String(summary.course || fallbackSummary.course || ""),
      operator: String(summary.operator || fallbackSummary.operator || ""),
      source_files: Array.isArray(summary.source_files) ? summary.source_files.map(String) : fallbackSummary.source_files,
      overall_confidence: overallConfidence,
      notes: Array.isArray(summary.notes) ? summary.notes.map(String) : fallbackSummary.notes,
    },
    reaction_table: normalizeReactionRows(
      Array.isArray(analysis.reaction_table) && analysis.reaction_table.length > 0
        ? analysis.reaction_table
        : fallback.reaction_table,
      fallback.reaction_table,
    ),
    procedure_timeline: Array.isArray(analysis.procedure_timeline) && analysis.procedure_timeline.length > 0
      ? analysis.procedure_timeline
      : fallback.procedure_timeline,
    raw_data: normalizeRawData(analysis.raw_data, fallback.raw_data),
    calculations: Array.isArray(analysis.calculations) && analysis.calculations.length > 0 ? analysis.calculations : fallback.calculations,
    observations: Array.isArray(analysis.observations) ? analysis.observations : fallback.observations,
    missing_data: Array.isArray(analysis.missing_data) ? analysis.missing_data : fallback.missing_data,
    warnings: normalizeWarnings(analysis.warnings, fallback.warnings),
  };
}

function normalizeRawData(rawData: LabAnalysis["raw_data"], fallback: LabAnalysis["raw_data"]) {
  if (!rawData?.tables) return fallback;
  const hasRows = rawData.tables.some((table) => Array.isArray(table.rows) && table.rows.length > 0);
  return hasRows ? rawData : fallback;
}

function normalizeReactionRows(rows: LabAnalysis["reaction_table"], fallback: LabAnalysis["reaction_table"]) {
  const sourceRows = Array.isArray(rows) ? rows : fallback;
  return sourceRows
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      role: ["reactant", "product", "solvent", "catalyst", "reagent", "unknown"].includes(row.role)
        ? row.role
        : ("unknown" as const),
      chemical_name: String(row.chemical_name || "Missing"),
      formula: String(row.formula || ""),
      cas_number: String(row.cas_number || ""),
      molecular_weight: typeof row.molecular_weight === "number" ? row.molecular_weight : null,
      mass: typeof row.mass === "number" ? row.mass : null,
      mass_unit: String(row.mass_unit || ""),
      volume: typeof row.volume === "number" ? row.volume : null,
      volume_unit: String(row.volume_unit || ""),
      density: typeof row.density === "number" ? row.density : null,
      density_unit: String(row.density_unit || ""),
      concentration: typeof row.concentration === "number" ? row.concentration : null,
      concentration_unit: String(row.concentration_unit || ""),
      moles: typeof row.moles === "number" ? row.moles : null,
      equivalents: typeof row.equivalents === "number" ? row.equivalents : null,
      hazards: Array.isArray(row.hazards) ? row.hazards.map(String) : [],
      notes: String(row.notes || ""),
      source_reference: String(row.source_reference || ""),
    }));
}

function normalizeWarnings(warnings: LabAnalysis["warnings"], fallback: LabAnalysis["warnings"]) {
  const sourceWarnings = (Array.isArray(warnings) ? warnings : fallback) as unknown[];
  return sourceWarnings.map((warning) => {
    if (typeof warning === "string") {
      return {
        type: "ai_warning",
        message: warning,
        severity: "medium",
      };
    }
    const record = warning && typeof warning === "object" ? (warning as Record<string, unknown>) : {};
    return {
      type: String(record.type || "warning"),
      message: String(record.message || ""),
      severity: String(record.severity || "medium"),
    };
  });
}

function normalizeExperimentType(value: string, fallback: string): LabAnalysis["experiment_summary"]["experiment_type"] {
  if ((experimentTypes as readonly string[]).includes(value)) {
    return value as LabAnalysis["experiment_summary"]["experiment_type"];
  }
  if (/column|flash|chromatography|purification|separat/i.test(value || "")) return "Purification";
  if ((experimentTypes as readonly string[]).includes(fallback)) {
    return fallback as LabAnalysis["experiment_summary"]["experiment_type"];
  }
  return "Unknown / uncertain";
}

function normalizeConfidence(value: string, fallback: string): LabAnalysis["experiment_summary"]["overall_confidence"] {
  if ((confidenceLevels as readonly string[]).includes(value)) {
    return value as LabAnalysis["experiment_summary"]["overall_confidence"];
  }
  if ((confidenceLevels as readonly string[]).includes(fallback)) {
    return fallback as LabAnalysis["experiment_summary"]["overall_confidence"];
  }
  return "unknown";
}

function addSourceDiagnostics(analysis: LabAnalysis, blocks: ParsedDocumentBlock[]): LabAnalysis {
  const unreadableFiles = Array.from(
    new Set(
      blocks
        .filter((block) => !hasReadableExtractedText(block))
        .map((block) => block.source_file),
    ),
  );

  if (unreadableFiles.length === 0) return analysis;

  const warningMessage = `No readable text was extracted from ${unreadableFiles.join(", ")}. These files are likely scanned PDFs, notebook photos, or image-only documents and require a configured OCR provider before chemicals, procedure steps, and raw data can be extracted.`;
  const hasWarning = analysis.warnings.some((warning) => warning.type === "ocr_required" && warning.message === warningMessage);
  const hasMissingItem = analysis.missing_data.some((item) => item.item === "Readable source text / OCR");

  return {
    ...analysis,
    missing_data: hasMissingItem
      ? analysis.missing_data
      : [
          {
            item: "Readable source text / OCR",
            why_it_matters: "The uploaded file did not provide extractable text, so AI cannot read chemicals, steps, or tables.",
            suggested_user_check: "Upload a text-readable PDF/DOCX/CSV/XLSX version or configure cloud OCR for scanned PDFs and photos.",
            severity: "high",
          },
          ...analysis.missing_data,
        ],
    warnings: hasWarning
      ? analysis.warnings
      : [
          {
            type: "ocr_required",
            message: warningMessage,
            severity: "high",
          },
          ...analysis.warnings,
        ],
  };
}

function hasReadableExtractedText(block: ParsedDocumentBlock) {
  const content = block.content.trim();
  if (!content) return false;
  if (block.metadata.requires_ocr_provider || block.metadata.scanned_or_image_only) return false;
  return !/^OCR pending:|^Missing readable|^OCR returned no readable text|^OCR failed:/i.test(content);
}

function pickArrayStageResult<T>(value: unknown, keys: string[], fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return fallback;
}

function pickRawDataStageResult(value: unknown, fallback: LabAnalysis["raw_data"]): LabAnalysis["raw_data"] {
  if (isRawDataLike(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (isRawDataLike(record.raw_data)) return record.raw_data;
    if (Array.isArray(record.tables)) {
      return {
        data_type: typeof record.data_type === "string" ? record.data_type : fallback.data_type,
        tables: record.tables as LabAnalysis["raw_data"]["tables"],
      };
    }
  }
  return fallback;
}

function pickAnalysisStageResult(value: unknown, fallback: LabAnalysis): LabAnalysis {
  if (isAnalysisLike(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (isAnalysisLike(record.analysis)) return record.analysis;
    if (isAnalysisLike(record.lab_analysis)) return record.lab_analysis;
  }
  return fallback;
}

function isRawDataLike(value: unknown): value is LabAnalysis["raw_data"] {
  return Boolean(value && typeof value === "object" && Array.isArray((value as LabAnalysis["raw_data"]).tables));
}

function isAnalysisLike(value: unknown): value is LabAnalysis {
  const analysis = value as LabAnalysis | null;
  return Boolean(
    analysis &&
      typeof analysis === "object" &&
      analysis.experiment_summary &&
      Array.isArray(analysis.reaction_table) &&
      Array.isArray(analysis.procedure_timeline) &&
      analysis.raw_data &&
      Array.isArray(analysis.calculations) &&
      Array.isArray(analysis.observations) &&
      Array.isArray(analysis.missing_data) &&
      Array.isArray(analysis.warnings),
  );
}

function reconcileExperimentDetection<T extends { experiment_type: string; experiment_title: string; aim: string; confidence: string; workflow_types?: string[] }>(
  fallback: T,
  candidate: T,
): T {
  if (fallback.experiment_type !== "Unknown / uncertain" && candidate.experiment_type !== fallback.experiment_type) {
    return {
      ...candidate,
      experiment_title: candidate.experiment_title || fallback.experiment_title,
      experiment_type: fallback.experiment_type,
      aim: candidate.aim && candidate.aim !== "Missing" ? candidate.aim : fallback.aim,
      confidence: fallback.confidence,
      workflow_types: fallback.workflow_types,
    };
  }
  return {
    ...candidate,
    workflow_types: Array.isArray(candidate.workflow_types) ? candidate.workflow_types : fallback.workflow_types,
  };
}

function reinforceDeterministicEvidence(
  analysis: LabAnalysis,
  blocks: ParsedDocumentBlock[],
  options: AnalysisUserOptions,
): LabAnalysis {
  const fallbackExperiment = detectExperiment(blocks, options);
  const fallbackReaction = detectReaction(blocks, fallbackExperiment.experiment_type);
  const shouldUseFallbackType =
    fallbackExperiment.experiment_type !== "Unknown / uncertain" &&
    analysis.experiment_summary.experiment_type !== fallbackExperiment.experiment_type;
  const shouldUseFallbackReaction = fallbackReaction.detected_reaction === "Not a reaction-centred experiment";

  if (!shouldUseFallbackType && !shouldUseFallbackReaction) {
    return analysis;
  }

  const notes = [...analysis.experiment_summary.notes];
  if (shouldUseFallbackType) {
    notes.push(
      fallbackExperiment.workflow_types.length > 1
        ? `Experiment type follows detected workflow order: ${fallbackExperiment.workflow_types.join(" -> ")}.`
        : "Experiment type reinforced from deterministic document cues.",
    );
  }
  if (shouldUseFallbackReaction && analysis.experiment_summary.detected_reaction !== fallbackReaction.detected_reaction) {
    notes.push("Reaction field normalized because the detected experiment is analytical or procedural, not reaction-centred.");
  }

  const next: LabAnalysis = {
    ...analysis,
    experiment_summary: {
      ...analysis.experiment_summary,
      experiment_title:
        analysis.experiment_summary.experiment_title ||
        fallbackExperiment.experiment_title ||
        fallbackExperiment.experiment_type,
      experiment_type: shouldUseFallbackType ? fallbackExperiment.experiment_type : analysis.experiment_summary.experiment_type,
      detected_reaction: shouldUseFallbackReaction
        ? fallbackReaction.detected_reaction
        : analysis.experiment_summary.detected_reaction,
      reaction_confidence: shouldUseFallbackReaction
        ? fallbackReaction.reaction_confidence
        : analysis.experiment_summary.reaction_confidence,
      aim: analysis.experiment_summary.aim === "Missing" ? fallbackExperiment.aim : analysis.experiment_summary.aim,
      overall_confidence: shouldUseFallbackType ? fallbackExperiment.confidence : analysis.experiment_summary.overall_confidence,
      notes,
    },
    raw_data: shouldUseFallbackType
      ? {
          ...analysis.raw_data,
          data_type: fallbackExperiment.experiment_type,
        }
      : analysis.raw_data,
  };

  next.calculations = identifyCalculations(next);
  return next;
}

function buildFallbackFromInvalid(analysis: LabAnalysis): LabAnalysis {
  return {
    ...analysis,
    warnings: [
      ...(Array.isArray(analysis.warnings) ? analysis.warnings : []),
      {
        type: "schema_validation",
        message: "AI output did not match the stable schema; deterministic fallback fields were used.",
        severity: "medium",
      },
    ],
  };
}

function compactBlocks(blocks: ParsedDocumentBlock[]) {
  return blocks.map((block) => ({
    source_file: block.source_file,
    file_type: block.file_type,
    page_or_sheet: block.page_or_sheet,
    block_type: block.block_type,
    content: block.content.slice(0, 6000),
    confidence: block.confidence,
    metadata: {
      columns: block.metadata.columns,
      row_count: Array.isArray(block.metadata.rows) ? block.metadata.rows.length : undefined,
    },
  }));
}

function cloneStages(): AnalysisStageStatus[] {
  return visibleStageLabels.map((stage) => ({ ...stage }));
}

function updateStage(
  stages: AnalysisStageStatus[],
  key: AnalysisStageStatus["key"],
  status: AnalysisStageStatus["status"],
  detail?: string,
) {
  const stage = stages.find((candidate) => candidate.key === key);
  if (stage) {
    stage.status = status;
    stage.detail = detail;
  }
}

function createAnalysisId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lab_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "experiment";
}
