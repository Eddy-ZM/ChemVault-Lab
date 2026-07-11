import type { ChemVaultLabBindings } from "../db/bindings";
import type { AnalysisPipelineResult, AnalysisUserOptions } from "../files/types";

export interface ArtifactWritebackResult {
  kind: "json" | "markdown" | "latex" | "xlsx";
  status: "completed" | "failed" | "skipped";
  fileId?: string;
  error?: string;
}

export async function publishAnalysisArtifactsToFiles(input: {
  env: ChemVaultLabBindings;
  result: AnalysisPipelineResult;
  options: AnalysisUserOptions;
  userId: string;
  userEmail?: string;
}): Promise<ArtifactWritebackResult[]> {
  if (!input.options.sourceFileId) return [];
  if (!input.userEmail || !input.env.FILES_ARTIFACT_WRITE_SECRET) {
    return [{ kind: "json", status: "failed", error: "Files artifact writeback is not configured for this user." }];
  }

  const artifacts: Array<{ kind: ArtifactWritebackResult["kind"]; enabled: boolean; name: string; type: string; body?: BodyInit }> = [
    {
      kind: "json",
      enabled: input.options.generateJson,
      name: `${input.result.filenameSlug}.analysis.json`,
      type: "application/json",
      body: JSON.stringify(input.result.analysis, null, 2),
    },
    {
      kind: "markdown",
      enabled: input.options.generateMarkdown,
      name: `${input.result.filenameSlug}.summary.md`,
      type: "text/markdown;charset=utf-8",
      body: input.result.markdown,
    },
    {
      kind: "latex",
      enabled: input.options.generateLatex,
      name: `${input.result.filenameSlug}.summary.tex`,
      type: "application/x-tex;charset=utf-8",
      body: input.result.latex,
    },
    {
      kind: "xlsx",
      enabled: input.options.generateExcel,
      name: input.result.excelFilename,
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: input.result.excelBuffer,
    },
  ];

  const origin = (input.env.FILES_SERVICE_ORIGIN || "https://file.chemvault.science").replace(/\/$/, "");
  return Promise.all(
    artifacts.map(async (artifact): Promise<ArtifactWritebackResult> => {
      if (!artifact.enabled || !artifact.body) return { kind: artifact.kind, status: "skipped" };
      try {
        const response = await fetch(`${origin}/api/internal/artifacts`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${input.env.FILES_ARTIFACT_WRITE_SECRET}`,
            "content-type": artifact.type,
            "x-chemvault-user-email": input.userEmail || "",
            "x-chemvault-user-id": input.userId,
            "x-chemvault-source-file-id": input.options.sourceFileId || "",
            "x-chemvault-analysis-id": input.result.id,
            "x-chemvault-artifact-kind": artifact.kind,
            "x-chemvault-artifact-name": encodeURIComponent(artifact.name),
          },
          body: artifact.body,
          signal: AbortSignal.timeout(12_000),
        });
        const payload = (await response.json().catch(() => null)) as { artifact?: { id?: string }; error?: { message?: string } } | null;
        if (!response.ok) {
          return { kind: artifact.kind, status: "failed", error: payload?.error?.message || `Files returned HTTP ${response.status}.` };
        }
        return { kind: artifact.kind, status: "completed", fileId: payload?.artifact?.id };
      } catch (error) {
        return {
          kind: artifact.kind,
          status: "failed",
          error: error instanceof Error ? error.message.slice(0, 240) : "Artifact writeback failed.",
        };
      }
    }),
  );
}
