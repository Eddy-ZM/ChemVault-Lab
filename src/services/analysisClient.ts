import type { AnalysisPipelineResult, AnalysisUserOptions, LabFileLike } from "../files/types";
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
  const remote = await tryRemoteAnalysis(files, options);
  if (remote) return { ...remote, remote: true };

  const { analyseLabFiles } = await import("../analysis/pipeline");
  const local = await analyseLabFiles(files as LabFileLike[], options, { AI_PROVIDER: "heuristic" });
  return { ...local, remote: false };
}

async function tryRemoteAnalysis(files: File[], options: AnalysisUserOptions): Promise<AnalysisPipelineResult | null> {
  try {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("metadata", JSON.stringify(options));

    const response = await fetchWithAuth("/api/analyse", {
      method: "POST",
      body: form,
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as RemoteAnalyseResponse;

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
  } catch {
    return null;
  }
}
