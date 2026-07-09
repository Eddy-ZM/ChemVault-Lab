import type { AnalysisPipelineResult, StoredAnalysisRecord } from "../files/types";

const historyKey = "chemvault_lab_history_v1";

export function saveAnalysisToHistory(result: AnalysisPipelineResult, remote = false): StoredAnalysisRecord {
  const record: StoredAnalysisRecord = {
    id: result.id,
    date: result.createdAt,
    experimentTitle: result.analysis.experiment_summary.experiment_title || "Untitled experiment",
    fileCount: result.fileCount,
    status: "complete",
    analysis: result.analysis,
    markdown: result.markdown,
    latex: result.latex,
    excelFilename: result.excelFilename,
    remoteDownloads: remote
      ? {
          xlsx: `/api/download/${result.id}/xlsx`,
          json: `/api/download/${result.id}/json`,
          markdown: `/api/download/${result.id}/markdown`,
          latex: `/api/download/${result.id}/latex`,
        }
      : undefined,
  };

  const records = listAnalysisHistory().filter((item) => item.id !== record.id);
  records.unshift(record);
  localStorage.setItem(historyKey, JSON.stringify(records.slice(0, 50)));
  return record;
}

export function listAnalysisHistory(): StoredAnalysisRecord[] {
  try {
    const raw = localStorage.getItem(historyKey);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAnalysisRecord[];
  } catch {
    return [];
  }
}

export function getAnalysisRecord(id: string): StoredAnalysisRecord | null {
  return listAnalysisHistory().find((record) => record.id === id) || null;
}

export function deleteAnalysisRecord(id: string) {
  const records = listAnalysisHistory().filter((record) => record.id !== id);
  localStorage.setItem(historyKey, JSON.stringify(records));
  return records;
}

export function clearAnalysisHistory() {
  localStorage.removeItem(historyKey);
}
