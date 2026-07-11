import type { ChemVaultLabBindings } from "../db/bindings";
import type { StoredAnalysisRecord } from "../files/types";

export interface PersistedBatchJob {
  id: string;
  ownerId: string;
  projectId: null;
  workspaceId: null;
  userId: string;
  type: "ai_extraction";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  totalItems: number;
  completedItems: number;
  failedItems: number;
  progress: number;
  error: string | null;
  retryCount: number;
  sourceAnalysisIds: string[];
  estimatedTotalCostUsd: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface BatchJobRow {
  id: string;
  owner_id: string;
  status: PersistedBatchJob["status"];
  total_items: number;
  completed_items: number;
  failed_items: number;
  source_analysis_ids_json: string;
  error: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function requireDb(env: ChemVaultLabBindings): D1Database {
  if (!env.LAB_DB) throw new Error("Lab database is not configured.");
  return env.LAB_DB;
}

function parseIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toBatchJob(row: BatchJobRow): PersistedBatchJob {
  const progress = row.total_items > 0 ? (row.completed_items + row.failed_items) / row.total_items : 0;
  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: null,
    workspaceId: null,
    userId: row.owner_id,
    type: "ai_extraction",
    status: row.status,
    totalItems: row.total_items,
    completedItems: row.completed_items,
    failedItems: row.failed_items,
    progress,
    error: row.error,
    retryCount: row.retry_count,
    sourceAnalysisIds: parseIds(row.source_analysis_ids_json),
    estimatedTotalCostUsd: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function statusCounts(records: StoredAnalysisRecord[]) {
  const completedItems = records.filter((record) => record.status === "complete" || record.status === "completed").length;
  const failedItems = records.filter((record) => record.status === "failed" || record.status === "error").length;
  const status: PersistedBatchJob["status"] = records.length === 0
    ? "failed"
    : failedItems > 0
      ? "failed"
      : completedItems === records.length
        ? "completed"
        : "running";
  return { completedItems, failedItems, status };
}

export async function createBatchJob(
  env: ChemVaultLabBindings,
  ownerId: string,
  records: StoredAnalysisRecord[],
): Promise<PersistedBatchJob> {
  const db = requireDb(env);
  const id = `lab-batch-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const counts = statusCounts(records);
  const error = records.length === 0 ? "No persisted analyses were available for this batch." : counts.failedItems > 0 ? "One or more analyses failed." : null;
  const completedAt = counts.status === "completed" || counts.status === "failed" ? now : null;
  await db.prepare(
    `INSERT INTO lab_batch_jobs
      (id, owner_id, status, total_items, completed_items, failed_items, source_analysis_ids_json,
       error, retry_count, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  )
    .bind(
      id,
      ownerId,
      counts.status,
      records.length,
      counts.completedItems,
      counts.failedItems,
      JSON.stringify(records.map((record) => record.id)),
      error,
      now,
      now,
      completedAt,
    )
    .run();
  const job = await getBatchJob(env, ownerId, id);
  if (!job) throw new Error("Persisted batch job could not be loaded.");
  return job;
}

export async function listBatchJobs(env: ChemVaultLabBindings, ownerId: string): Promise<PersistedBatchJob[]> {
  const result = await requireDb(env)
    .prepare("SELECT * FROM lab_batch_jobs WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100")
    .bind(ownerId)
    .all<BatchJobRow>();
  return result.results.map(toBatchJob);
}

export async function getBatchJob(env: ChemVaultLabBindings, ownerId: string, id: string): Promise<PersistedBatchJob | null> {
  const row = await requireDb(env)
    .prepare("SELECT * FROM lab_batch_jobs WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .first<BatchJobRow>();
  return row ? toBatchJob(row) : null;
}

export async function cancelBatchJob(env: ChemVaultLabBindings, ownerId: string, id: string): Promise<PersistedBatchJob | null> {
  const current = await getBatchJob(env, ownerId, id);
  if (!current) return null;
  if (current.status !== "queued" && current.status !== "running") return current;
  const now = new Date().toISOString();
  await requireDb(env)
    .prepare("UPDATE lab_batch_jobs SET status = 'cancelled', updated_at = ?, completed_at = ? WHERE id = ? AND owner_id = ?")
    .bind(now, now, id, ownerId)
    .run();
  return getBatchJob(env, ownerId, id);
}

export async function retryBatchJob(
  env: ChemVaultLabBindings,
  ownerId: string,
  id: string,
  records: StoredAnalysisRecord[],
): Promise<PersistedBatchJob | null> {
  const current = await getBatchJob(env, ownerId, id);
  if (!current) return null;
  if (current.status !== "failed") return current;
  const scopedRecords = records.filter((record) => current.sourceAnalysisIds.includes(record.id));
  const counts = statusCounts(scopedRecords);
  const now = new Date().toISOString();
  const error = counts.status === "failed" ? "One or more analyses still fail after retry reconciliation." : null;
  const completedAt = counts.status === "running" ? null : now;
  await requireDb(env).prepare(
    `UPDATE lab_batch_jobs
     SET status = ?, completed_items = ?, failed_items = ?, error = ?, retry_count = retry_count + 1,
         updated_at = ?, completed_at = ?
     WHERE id = ? AND owner_id = ?`,
  )
    .bind(counts.status, counts.completedItems, counts.failedItems, error, now, completedAt, id, ownerId)
    .run();
  return getBatchJob(env, ownerId, id);
}
