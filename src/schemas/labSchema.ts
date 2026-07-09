import { z } from "zod";

export const experimentTypes = [
  "Organic synthesis",
  "Recrystallisation",
  "Distillation",
  "TLC",
  "Titration",
  "HPLC",
  "UV-Vis",
  "NMR analysis",
  "IR analysis",
  "Enzyme kinetics",
  "Calibration curve",
  "Extraction",
  "Purification",
  "Kinetics",
  "General wet lab experiment",
  "Unknown / uncertain",
] as const;

export const confidenceLevels = ["low", "medium", "high", "unknown"] as const;

export const parsedDocumentBlockSchema = z.object({
  source_file: z.string(),
  file_type: z.string(),
  page_or_sheet: z.string(),
  block_type: z.enum(["text", "table", "image_ocr"]),
  content: z.string(),
  confidence: z.union([z.number().min(0).max(1), z.enum(confidenceLevels)]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const experimentSummarySchema = z.object({
  experiment_title: z.string(),
  experiment_type: z.enum(experimentTypes),
  detected_reaction: z.string(),
  reaction_confidence: z.enum(confidenceLevels),
  aim: z.string(),
  date: z.string(),
  course: z.string(),
  operator: z.string(),
  source_files: z.array(z.string()),
  overall_confidence: z.enum(confidenceLevels),
  notes: z.array(z.string()),
});

export const reactionRowSchema = z.object({
  role: z.enum(["reactant", "product", "solvent", "catalyst", "reagent", "unknown"]),
  chemical_name: z.string(),
  formula: z.string(),
  cas_number: z.string(),
  molecular_weight: z.number().nullable(),
  mass: z.number().nullable(),
  mass_unit: z.string(),
  volume: z.number().nullable(),
  volume_unit: z.string(),
  density: z.number().nullable(),
  density_unit: z.string(),
  concentration: z.number().nullable(),
  concentration_unit: z.string(),
  moles: z.number().nullable(),
  equivalents: z.number().nullable(),
  hazards: z.array(z.string()),
  notes: z.string(),
  source_reference: z.string(),
});

export const procedureStepSchema = z.object({
  step_number: z.number(),
  operation: z.string(),
  materials: z.array(z.string()),
  quantity: z.string(),
  temperature: z.string(),
  time: z.string(),
  observation: z.string(),
  source_reference: z.string(),
  confidence: z.enum(confidenceLevels),
});

export const rawDataTableSchema = z.object({
  table_name: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
  source_reference: z.string(),
});

export const rawDataSchema = z.object({
  data_type: z.string(),
  tables: z.array(rawDataTableSchema),
});

export const calculationSchema = z.object({
  name: z.string(),
  formula: z.string(),
  inputs: z.record(z.string(), z.unknown()),
  result: z.number().nullable(),
  unit: z.string(),
  calculation_status: z.enum(["calculated", "extracted", "insufficient_data"]),
  source_data: z.string(),
  confidence: z.enum(confidenceLevels),
  notes: z.string(),
});

export const observationSchema = z.object({
  step: z.string(),
  time: z.string(),
  observation: z.string(),
  colour_change: z.string(),
  phase_change: z.string(),
  precipitate: z.string(),
  gas_evolution: z.string(),
  temperature_change: z.string(),
  source_reference: z.string(),
});

export const missingDataSchema = z.object({
  item: z.string(),
  why_it_matters: z.string(),
  suggested_user_check: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

export const warningSchema = z.object({
  type: z.string(),
  message: z.string(),
  severity: z.string(),
});

export const labAnalysisSchema = z.object({
  experiment_summary: experimentSummarySchema,
  reaction_table: z.array(reactionRowSchema),
  procedure_timeline: z.array(procedureStepSchema),
  raw_data: rawDataSchema,
  calculations: z.array(calculationSchema),
  observations: z.array(observationSchema),
  missing_data: z.array(missingDataSchema),
  warnings: z.array(warningSchema),
});

export type ParsedDocumentBlock = z.infer<typeof parsedDocumentBlockSchema>;
export type LabAnalysis = z.infer<typeof labAnalysisSchema>;
export type ExperimentType = (typeof experimentTypes)[number];
export type ConfidenceLevel = (typeof confidenceLevels)[number];
export type ReactionRow = z.infer<typeof reactionRowSchema>;
export type RawDataTable = z.infer<typeof rawDataTableSchema>;
export type Calculation = z.infer<typeof calculationSchema>;
