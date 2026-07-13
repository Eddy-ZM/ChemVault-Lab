import { requireSession } from "../auth/jwt";
import type { ChemVaultLabBindings } from "../db/bindings";

export const ANALYSIS_MAX_FILES = 12;
export const ANALYSIS_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ANALYSIS_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const ANALYSIS_MAX_REQUEST_BYTES = 55 * 1024 * 1024;
export const ANALYSIS_REQUESTS_PER_MINUTE = 5;

type VerifiedSession = NonNullable<Awaited<ReturnType<typeof requireSession>>>;

export type AuthorizedAnalysisUpload = {
  error: null;
  session: VerifiedSession;
  form: FormData;
  files: File[];
};

export type RejectedAnalysisUpload = {
  error: Response;
  session: VerifiedSession | null;
  form: null;
  files: [];
};

export async function authorizeAnalysisUpload(
  request: Request,
  env: ChemVaultLabBindings,
): Promise<AuthorizedAnalysisUpload | RejectedAnalysisUpload> {
  const session = await requireSession(request, env);
  if (!session) return rejected("Sign in to ChemVault Lab before uploading files.", 401);
  if (!env.LAB_DB || !env.LAB_BUCKET) {
    return rejected("ChemVault Lab storage is temporarily unavailable. No files were accepted.", 503, session);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > ANALYSIS_MAX_REQUEST_BYTES) {
    return rejected("The upload request exceeds the 55 MB limit.", 413, session);
  }

  const rateLimit = await consumeAnalysisRateLimit(env.LAB_DB, session.sub);
  if (!rateLimit.allowed) {
    return rejected(
      `Analysis rate limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      429,
      session,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  const singleFile = form.get("file");
  if (singleFile instanceof File && !files.includes(singleFile)) files.push(singleFile);
  const validationError = validateAnalysisFiles(files);
  if (validationError) return rejected(validationError, 413, session);
  return { error: null, session, form, files };
}

export function validateAnalysisFiles(files: Pick<File, "name" | "size">[]): string | null {
  if (files.length === 0) return "At least one file is required.";
  if (files.length > ANALYSIS_MAX_FILES) return `Upload at most ${ANALYSIS_MAX_FILES} files per analysis.`;
  let totalBytes = 0;
  for (const file of files) {
    if (file.size <= 0) return `${file.name || "A file"} is empty.`;
    if (file.size > ANALYSIS_MAX_FILE_BYTES) return `${file.name || "A file"} exceeds the 20 MB file limit.`;
    totalBytes += file.size;
  }
  if (totalBytes > ANALYSIS_MAX_TOTAL_BYTES) return "The selected files exceed the 50 MB total limit.";
  return null;
}

export function analysisMinuteBucket(now = Date.now()) {
  return new Date(Math.floor(now / 60_000) * 60_000).toISOString();
}

async function consumeAnalysisRateLimit(db: D1Database, ownerId: string, now = Date.now()) {
  const windowStart = analysisMinuteBucket(now);
  const key = `${ownerId}:${windowStart}`;
  const row = await db
    .prepare(
      `INSERT INTO lab_analysis_rate_limits (id, owner_id, window_start, request_count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET request_count = request_count + 1
       RETURNING request_count`,
    )
    .bind(key, ownerId, windowStart)
    .first<{ request_count: number }>();
  await db
    .prepare("DELETE FROM lab_analysis_rate_limits WHERE window_start < ?")
    .bind(new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .run();
  const requestCount = Number(row?.request_count || 1);
  return {
    allowed: requestCount <= ANALYSIS_REQUESTS_PER_MINUTE,
    retryAfterSeconds: Math.max(1, 60 - Math.floor((now % 60_000) / 1000)),
  };
}

function rejected(
  message: string,
  status: number,
  session: VerifiedSession | null = null,
  headers: HeadersInit = {},
): RejectedAnalysisUpload {
  return {
    error: Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } }),
    session,
    form: null,
    files: [],
  };
}
