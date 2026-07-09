import type { AnalysisStageStatus } from "../files/types";

export const visibleStageLabels: AnalysisStageStatus[] = [
  { key: "files_uploaded", label: "Files uploaded", status: "pending" },
  { key: "text_extracted", label: "Text extracted", status: "pending" },
  { key: "document_type_detected", label: "Document type detected", status: "pending" },
  { key: "experiment_detected", label: "Experiment detected", status: "pending" },
  { key: "reaction_detected", label: "Reaction detected", status: "pending" },
  { key: "data_structured", label: "Data structured", status: "pending" },
  { key: "excel_generated", label: "Excel generated", status: "pending" },
];
