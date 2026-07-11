import type { AnalysisPipelineResult } from "../files/types";
import type { ChemVaultLabBindings } from "../db/bindings";
import {
  CHEMVAULT_EVENT_SPEC_VERSION,
  type ChemVaultEventEnvelope,
  type LabAnalysisCompletedData,
} from "./contract";

interface OutboxRow {
  id: string;
  payload_json: string;
  attempt_count: number;
}

export function buildAnalysisCompletedEvent(
  env: ChemVaultLabBindings,
  result: AnalysisPipelineResult,
  ownerId: string,
): ChemVaultEventEnvelope<LabAnalysisCompletedData> {
  const baseUrl = (env.APP_BASE_URL || "https://lab.chemvault.science").replace(/\/$/, "");
  const artifactLinks = Object.fromEntries(
    ["xlsx", "json", "markdown", "latex"].map((format) => [
      format,
      `${baseUrl}/api/download/${encodeURIComponent(result.id)}/${format}`,
    ]),
  );
  const title = result.analysis.experiment_summary.experiment_title || "Untitled experiment";

  return {
    specVersion: CHEMVAULT_EVENT_SPEC_VERSION,
    id: crypto.randomUUID(),
    type: "lab.analysis.completed",
    source: "chemvault-lab",
    subject: `analysis/${result.id}`,
    time: result.createdAt,
    user: { id: ownerId },
    data: {
      analysisId: result.id,
      title,
      summary: `${title} is ready with ${result.fileCount} source file${result.fileCount === 1 ? "" : "s"}.`,
      deepLink: `${baseUrl}/result/${encodeURIComponent(result.id)}`,
      fileCount: result.fileCount,
      artifactLinks,
    },
  };
}

export async function enqueueAnalysisCompletedEvent(
  env: ChemVaultLabBindings,
  result: AnalysisPipelineResult,
  ownerId: string,
): Promise<string | null> {
  if (!env.LAB_DB) return null;
  const event = buildAnalysisCompletedEvent(env, result, ownerId);
  const now = new Date().toISOString();
  await env.LAB_DB.prepare(
    `INSERT OR IGNORE INTO lab_outbox_events
      (id, owner_id, event_type, aggregate_type, aggregate_id, payload_json, status, attempt_count, created_at, updated_at)
      VALUES (?, ?, ?, 'analysis', ?, ?, 'pending', 0, ?, ?)`,
  )
    .bind(event.id, ownerId, event.type, result.id, JSON.stringify(event), now, now)
    .run();
  return event.id;
}

export async function deliverOutboxEvents(env: ChemVaultLabBindings, limit = 10) {
  if (!env.LAB_DB || !env.NOTIFICATIONS_EVENT_URL || !env.EVENT_DELIVERY_SECRET) {
    return { configured: false, delivered: 0, failed: 0 };
  }

  const now = new Date().toISOString();
  const rows = await env.LAB_DB.prepare(
    `SELECT id, payload_json, attempt_count
       FROM lab_outbox_events
      WHERE status IN ('pending', 'failed')
        AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
      ORDER BY created_at ASC
      LIMIT ?`,
  )
    .bind(now, Math.max(1, Math.min(limit, 50)))
    .all<OutboxRow>();

  let delivered = 0;
  let failed = 0;
  for (const row of rows.results || []) {
    const claimed = await env.LAB_DB.prepare(
      `UPDATE lab_outbox_events SET status = 'delivering', updated_at = ?
        WHERE id = ? AND status IN ('pending', 'failed')`,
    )
      .bind(now, row.id)
      .run();
    if (!claimed.meta.changes) continue;

    try {
      const response = await fetch(env.NOTIFICATIONS_EVENT_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-chemvault-event-key": env.EVENT_DELIVERY_SECRET,
        },
        body: row.payload_json,
      });
      if (!response.ok) throw new Error(`Notifications rejected event (${response.status}).`);
      const completedAt = new Date().toISOString();
      await env.LAB_DB.prepare(
        `UPDATE lab_outbox_events
            SET status = 'delivered', attempt_count = attempt_count + 1, delivered_at = ?, updated_at = ?, last_error = NULL
          WHERE id = ?`,
      )
        .bind(completedAt, completedAt, row.id)
        .run();
      delivered += 1;
    } catch (error) {
      const attemptCount = row.attempt_count + 1;
      const deadLetter = attemptCount >= 8;
      const retryAt = deadLetter
        ? null
        : new Date(Date.now() + Math.min(60 * 60_000, 2 ** attemptCount * 30_000)).toISOString();
      await env.LAB_DB.prepare(
        `UPDATE lab_outbox_events
            SET status = ?, attempt_count = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
          WHERE id = ?`,
      )
        .bind(
          deadLetter ? "dead_letter" : "failed",
          attemptCount,
          retryAt,
          error instanceof Error ? error.message.slice(0, 500) : "Event delivery failed.",
          new Date().toISOString(),
          row.id,
        )
        .run();
      failed += 1;
    }
  }

  return { configured: true, delivered, failed };
}
