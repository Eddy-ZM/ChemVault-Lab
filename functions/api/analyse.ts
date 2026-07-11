import { analyseLabFiles } from "../../src/analysis/pipeline";
import { requireSession } from "../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../src/db/bindings";
import type { AnalysisUserOptions } from "../../src/files/types";
import { persistAnalysis } from "../../src/storage/serverStore";
import { deliverOutboxEvents, enqueueAnalysisCompletedEvent } from "../../src/events/outbox";
import { recordProductEvent } from "../../src/analytics/events";
import { publishAnalysisArtifactsToFiles } from "../../src/integrations/filesArtifacts";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const requestStartedAt = Date.now();
  let analyticsSubjectId: string | null = null;
  let analyticsFileCount = 0;
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (files.length === 0) {
      return Response.json({ error: "At least one file is required." }, { status: 400 });
    }
    analyticsFileCount = files.length;
    const metadataRaw = String(form.get("metadata") || "{}");
    const metadata = parseMetadata(metadataRaw);
    if (!metadata) {
      return Response.json({ error: "metadata must be valid JSON." }, { status: 400 });
    }
    const session = await requireSession(request, env);
    analyticsSubjectId = session?.sub || null;

    const result = await analyseLabFiles(files, metadata, {
      AI_PROVIDER: env.AI_PROVIDER,
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY,
      DEEPSEEK_BASE_URL: env.DEEPSEEK_BASE_URL,
      DEEPSEEK_MODEL: env.DEEPSEEK_MODEL,
      AI_STAGE_TIMEOUT_MS: env.AI_STAGE_TIMEOUT_MS,
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      AI: env.AI,
      OCR_PROVIDER: env.OCR_PROVIDER,
      OCR_API_KEY: env.OCR_API_KEY,
      OCR_ENDPOINT: env.OCR_ENDPOINT,
    });

    await persistAnalysis(env, result, files, session?.sub || null);
    const artifactWriteback = session?.sub
      ? await publishAnalysisArtifactsToFiles({
          env,
          result,
          options: metadata,
          userId: session.sub,
          userEmail: session.email,
        })
      : [];
    if (session?.sub) {
      await enqueueAnalysisCompletedEvent(env, result, session.sub);
      await deliverOutboxEvents(env, 5);
      await recordProductEvent(env, {
        eventName: "analysis_completed",
        subjectId: session.sub,
        properties: {
          fileCount: result.fileCount,
          provider: result.provider,
          source: metadata.sourceFileId ? "chemvault-files" : "direct",
          artifactsWritten: artifactWriteback.filter((item) => item.status === "completed").length,
          artifactWritebackFailures: artifactWriteback.filter((item) => item.status === "failed").length,
          durationMs: Date.now() - requestStartedAt,
        },
        occurredAt: result.createdAt,
      });
    }

    return Response.json({
      id: result.id,
      createdAt: result.createdAt,
      fileCount: result.fileCount,
      analysis: result.analysis,
      markdown: result.markdown,
      latex: result.latex,
      excelFilename: result.excelFilename,
      stages: result.stages,
      provider: result.provider,
      artifactWriteback,
      downloads: {
        xlsx: `/api/download/${result.id}/xlsx`,
        json: `/api/download/${result.id}/json`,
        markdown: `/api/download/${result.id}/markdown`,
        latex: `/api/download/${result.id}/latex`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error";
    if (analyticsSubjectId) {
      await recordProductEvent(env, {
        eventName: "analysis_failed",
        subjectId: analyticsSubjectId,
        properties: {
          fileCount: analyticsFileCount,
          durationMs: Date.now() - requestStartedAt,
          failureCategory: classifyFailure(message),
        },
      }).catch(() => false);
    }
    console.error("ChemVault Lab analysis failed", message);
    return Response.json(
      {
        error: "Analysis failed.",
        message,
      },
      { status: 500 },
    );
  }
};

function classifyFailure(message: string) {
  const normalized = message.toLowerCase();
  if (/timeout|timed out|abort/.test(normalized)) return "timeout";
  if (/ocr|image|pdf|docx|xlsx|parse/.test(normalized)) return "input_processing";
  if (/provider|openai|deepseek|model|ai/.test(normalized)) return "ai_provider";
  if (/database|bucket|storage|persist/.test(normalized)) return "persistence";
  return "unknown";
}

function parseMetadata(metadataRaw: string): AnalysisUserOptions | null {
  try {
    return JSON.parse(metadataRaw) as AnalysisUserOptions;
  } catch {
    return null;
  }
}
