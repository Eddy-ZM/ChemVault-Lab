import { analyseLabFiles } from "../../src/analysis/pipeline";
import { requireSession } from "../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../src/db/bindings";
import type { AnalysisUserOptions } from "../../src/files/types";
import { persistAnalysis } from "../../src/storage/serverStore";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (files.length === 0) {
      return Response.json({ error: "At least one file is required." }, { status: 400 });
    }
    const metadataRaw = String(form.get("metadata") || "{}");
    const metadata = parseMetadata(metadataRaw);
    if (!metadata) {
      return Response.json({ error: "metadata must be valid JSON." }, { status: 400 });
    }
    const session = await requireSession(request, env);

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
      downloads: {
        xlsx: `/api/download/${result.id}/xlsx`,
        json: `/api/download/${result.id}/json`,
        markdown: `/api/download/${result.id}/markdown`,
        latex: `/api/download/${result.id}/latex`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error";
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

function parseMetadata(metadataRaw: string): AnalysisUserOptions | null {
  try {
    return JSON.parse(metadataRaw) as AnalysisUserOptions;
  } catch {
    return null;
  }
}
