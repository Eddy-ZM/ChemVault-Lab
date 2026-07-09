import { fetchWithAuth, getStoredUser } from "../auth/client";
import type { StoredAnalysisRecord } from "../files/types";
import { deleteAnalysisRecord, listAnalysisHistory } from "./history";

const remoteCacheKey = "chemvault_lab_remote_records_v1";

export type WorkspaceRecordSource = "local" | "remote";

export async function loadWorkspaceRecords(): Promise<{ records: StoredAnalysisRecord[]; source: WorkspaceRecordSource }> {
  if (!getStoredUser()) {
    return { records: listAnalysisHistory(), source: "local" };
  }

  try {
    const response = await fetchWithAuth("/api/history");
    if (!response.ok) {
      return { records: listAnalysisHistory(), source: "local" };
    }
    const payload = (await response.json()) as { records?: StoredAnalysisRecord[] };
    const records = payload.records || [];
    cacheRemoteRecords(records);
    return { records, source: "remote" };
  } catch {
    return { records: listAnalysisHistory(), source: "local" };
  }
}

export function getCachedWorkspaceRecords() {
  const remoteRecords = readRemoteRecordCache();
  return remoteRecords.length > 0 ? remoteRecords : listAnalysisHistory();
}

export async function findWorkspaceRecord(id: string) {
  const cached = getCachedWorkspaceRecords().find((record) => record.id === id);
  if (cached) return cached;

  if (!getStoredUser()) return null;
  const { records } = await loadWorkspaceRecords();
  return records.find((record) => record.id === id) || null;
}

export async function deleteWorkspaceRecord(id: string, source: WorkspaceRecordSource) {
  if (source === "remote" && getStoredUser()) {
    const response = await fetchWithAuth(`/api/history/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Could not delete this analysis.");
    }
    removeCachedRecord(id);
    return;
  }

  deleteAnalysisRecord(id);
  removeCachedRecord(id);
}

export function clearWorkspaceRecordCache() {
  sessionStorage.removeItem(remoteCacheKey);
}

function cacheRemoteRecords(records: StoredAnalysisRecord[]) {
  sessionStorage.setItem(remoteCacheKey, JSON.stringify(records));
}

function removeCachedRecord(id: string) {
  const records = readRemoteRecordCache().filter((record) => record.id !== id);
  sessionStorage.setItem(remoteCacheKey, JSON.stringify(records));
}

function readRemoteRecordCache(): StoredAnalysisRecord[] {
  try {
    const raw = sessionStorage.getItem(remoteCacheKey);
    return raw ? (JSON.parse(raw) as StoredAnalysisRecord[]) : [];
  } catch {
    return [];
  }
}
