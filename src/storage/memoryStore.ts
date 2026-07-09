import type { AnalysisPipelineResult } from "../files/types";

type StoredServerAnalysis = Pick<
  AnalysisPipelineResult,
  "id" | "analysis" | "markdown" | "latex" | "excelBuffer" | "excelFilename" | "createdAt"
>;

declare global {
  // eslint-disable-next-line no-var
  var __CHEMVAULT_LAB_ANALYSES__: Map<string, StoredServerAnalysis> | undefined;
}

function getStore() {
  globalThis.__CHEMVAULT_LAB_ANALYSES__ ||= new Map<string, StoredServerAnalysis>();
  return globalThis.__CHEMVAULT_LAB_ANALYSES__;
}

export function putServerAnalysis(result: AnalysisPipelineResult) {
  getStore().set(result.id, {
    id: result.id,
    analysis: result.analysis,
    markdown: result.markdown,
    latex: result.latex,
    excelBuffer: result.excelBuffer,
    excelFilename: result.excelFilename,
    createdAt: result.createdAt,
  });
}

export function getServerAnalysis(id: string) {
  return getStore().get(id) || null;
}
