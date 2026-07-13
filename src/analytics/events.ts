import type { ChemVaultLabBindings } from "../db/bindings";

export const PRODUCT_EVENT_NAMES = [
  "files_import_started",
  "files_import_completed",
  "files_import_failed",
  "analysis_started",
  "analysis_completed",
  "analysis_failed",
  "result_viewed",
  "export_downloaded",
  "review_corrected",
  "result_rejected",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export interface ProductEventInput {
  eventName: ProductEventName;
  subjectId?: string | null;
  anonymousSessionId?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: string;
}

export function isProductEventName(value: unknown): value is ProductEventName {
  return typeof value === "string" && (PRODUCT_EVENT_NAMES as readonly string[]).includes(value);
}

export function sanitizeAnalyticsProperties(
  eventName: ProductEventName,
  value: unknown,
): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const output: Record<string, string | number | boolean> = {};
  if (eventName.startsWith("files_import_")) {
    addEnum(output, "source", input.source, ["files"]);
    if (eventName === "files_import_completed" && typeof input.mimeType === "string" && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(input.mimeType)) {
      output.mimeType = input.mimeType.slice(0, 80);
    }
  }
  if (eventName === "analysis_started" || eventName === "analysis_completed" || eventName === "analysis_failed") {
    addInteger(output, "fileCount", input.fileCount, 1, 12);
  }
  if (eventName === "analysis_started" || eventName === "analysis_completed") {
    addEnum(output, "source", input.source, ["direct", "files"]);
  }
  if (eventName === "analysis_completed") {
    addEnum(output, "provider", input.provider, ["deepseek", "openai", "cloudflare", "cloudflare-ai", "heuristic", "local"]);
    addInteger(output, "artifactsWritten", input.artifactsWritten, 0, 100);
    addInteger(output, "artifactWritebackFailures", input.artifactWritebackFailures, 0, 100);
    addInteger(output, "durationMs", input.durationMs, 0, 3_600_000);
  }
  if (eventName === "analysis_failed") {
    addInteger(output, "durationMs", input.durationMs, 0, 3_600_000);
    addEnum(output, "failureCategory", input.failureCategory, ["timeout", "input_processing", "ai_provider", "persistence", "unknown"]);
  }
  if (eventName === "result_viewed") addEnum(output, "source", input.source, ["result"]);
  if (eventName === "export_downloaded") addEnum(output, "format", input.format, ["xlsx", "json", "markdown", "latex"]);
  if (eventName === "review_corrected" || eventName === "result_rejected") {
    if (typeof input.hasExtractedData === "boolean") output.hasExtractedData = input.hasExtractedData;
    if (typeof input.hasReason === "boolean") output.hasReason = input.hasReason;
  }
  return output;
}

function addEnum(
  output: Record<string, string | number | boolean>,
  key: string,
  value: unknown,
  allowed: readonly string[],
) {
  if (typeof value === "string" && allowed.includes(value)) output[key] = value;
}

function addInteger(
  output: Record<string, string | number | boolean>,
  key: string,
  value: unknown,
  minimum: number,
  maximum: number,
) {
  if (typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum) output[key] = value;
}

export async function recordProductEvent(env: ChemVaultLabBindings, input: ProductEventInput): Promise<boolean> {
  if (!env.LAB_DB || !env.ANALYTICS_HASH_SALT) return false;
  const sourceId = input.subjectId || input.anonymousSessionId;
  if (!sourceId || !isProductEventName(input.eventName)) return false;
  const occurredAt = input.occurredAt && !Number.isNaN(Date.parse(input.occurredAt))
    ? new Date(input.occurredAt).toISOString()
    : new Date().toISOString();
  const subjectHash = await sha256(`${env.ANALYTICS_HASH_SALT}:${sourceId}`);
  await env.LAB_DB.prepare(
    `INSERT INTO lab_product_events (id, event_name, subject_hash, surface, properties_json, occurred_at)
     VALUES (?, ?, ?, 'lab', ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      input.eventName,
      subjectHash,
      JSON.stringify(sanitizeAnalyticsProperties(input.eventName, input.properties)),
      occurredAt,
    )
    .run();
  return true;
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
