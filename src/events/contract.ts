export const CHEMVAULT_EVENT_SPEC_VERSION = "1.0" as const;

export type ChemVaultEventType =
  | "files.file.ready"
  | "lab.analysis.started"
  | "lab.analysis.completed"
  | "lab.analysis.failed";

export interface ChemVaultEventEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> {
  specVersion: typeof CHEMVAULT_EVENT_SPEC_VERSION;
  id: string;
  type: ChemVaultEventType;
  source: "chemvault-files" | "chemvault-lab";
  subject: string;
  time: string;
  user: { id: string };
  data: TData;
}

export interface LabAnalysisCompletedData extends Record<string, unknown> {
  analysisId: string;
  title: string;
  summary: string;
  deepLink: string;
  fileCount: number;
  artifactLinks: Record<string, string>;
}
