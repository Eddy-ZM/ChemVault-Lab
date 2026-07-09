import { requireLabRecord } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  return Response.json({
    documentId: record.id,
    selectedChunks: 0,
    selectedChunkIds: [],
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    model: env.DEEPSEEK_MODEL || "lab-pipeline",
    estimatedCostUsd: 0,
    warning: "ChemVault Lab runs the staged lab extraction pipeline directly; this compatibility estimate is zero.",
  });
};
