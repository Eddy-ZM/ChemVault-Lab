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

export function sanitizeAnalyticsProperties(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-z][a-zA-Z0-9]{0,39}$/.test(key)) continue;
    if (/(email|name|token|secret|content|text|query|filename|path|url)/i.test(key)) continue;
    if (typeof item === "boolean") output[key] = item;
    if (typeof item === "number" && Number.isFinite(item)) output[key] = item;
    if (typeof item === "string" && item.length <= 80) output[key] = item;
  }
  return output;
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
      JSON.stringify(sanitizeAnalyticsProperties(input.properties)),
      occurredAt,
    )
    .run();
  return true;
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
