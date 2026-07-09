import type { LabAnalysis, ParsedDocumentBlock } from "../schemas/labSchema";

export type SupportedFileExtension =
  | "pdf"
  | "docx"
  | "xlsx"
  | "csv"
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "txt"
  | "asc"
  | "jdx"
  | "dx";

export type UploadIntent =
  | "Auto detect"
  | "Includes handout"
  | "No handout";

export type OutputLanguage = "English" | "Chinese" | "bilingual";

export type ArtifactFormat = "xlsx" | "json" | "markdown" | "latex";

export interface AnalysisUserOptions {
  uploadIntent: UploadIntent;
  experimentName?: string;
  courseName?: string;
  experimentDate?: string;
  operatorName?: string;
  outputLanguage: OutputLanguage;
  generateExcel: boolean;
  generateJson: boolean;
  generateMarkdown: boolean;
  generateLatex: boolean;
}

export interface LabFileLike {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface AnalysisStageStatus {
  key:
    | "files_uploaded"
    | "text_extracted"
    | "document_type_detected"
    | "experiment_detected"
    | "reaction_detected"
    | "data_structured"
    | "excel_generated";
  label: string;
  status: "pending" | "running" | "complete" | "warning" | "error";
  detail?: string;
}

export interface AnalysisPipelineResult {
  id: string;
  filenameSlug: string;
  createdAt: string;
  fileCount: number;
  parsedBlocks: ParsedDocumentBlock[];
  analysis: LabAnalysis;
  markdown: string;
  latex: string;
  excelFilename: string;
  excelBuffer?: ArrayBuffer;
  stages: AnalysisStageStatus[];
  provider: string;
}

export interface StoredAnalysisRecord {
  id: string;
  date: string;
  experimentTitle: string;
  fileCount: number;
  status: string;
  analysis: LabAnalysis;
  markdown: string;
  latex: string;
  excelFilename: string;
  remoteDownloads?: Partial<Record<ArtifactFormat, string>>;
}
