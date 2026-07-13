import type { AnalysisPipelineResult, AnalysisUserOptions } from "../files/types";
import { fetchWithAuth } from "../auth/client";

interface RemoteAnalyseResponse {
  id: string;
  createdAt: string;
  fileCount: number;
  analysis: AnalysisPipelineResult["analysis"];
  markdown: string;
  latex: string;
  excelFilename: string;
  stages: AnalysisPipelineResult["stages"];
  provider: string;
  downloads?: {
    xlsx?: string;
    json?: string;
    markdown?: string;
    latex?: string;
  };
}

export async function runAnalysis(files: File[], options: AnalysisUserOptions): Promise<AnalysisPipelineResult & { remote: boolean }> {
  const remote = await remoteAnalysis(files, options);
  return { ...remote, remote: true };
}

async function remoteAnalysis(files: File[], options: AnalysisUserOptions): Promise<AnalysisPipelineResult> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  form.append("metadata", JSON.stringify(options));

  const response = await fetchWithAuth("/api/analyse", {
    method: "POST",
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as (RemoteAnalyseResponse & { error?: string; message?: string }) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error || payload?.message || `Analysis request failed (${response.status}).`);
  }

  return {
    id: payload.id,
    filenameSlug: payload.excelFilename.replace(/^chemvault_lab_/, "").replace(/_\d{4}-\d{2}-\d{2}\.xlsx$/, ""),
    createdAt: payload.createdAt,
    fileCount: payload.fileCount,
    parsedBlocks: [],
    analysis: payload.analysis,
    markdown: payload.markdown,
    latex: payload.latex,
    excelFilename: payload.excelFilename,
    stages: payload.stages,
    provider: payload.provider,
  };
}
