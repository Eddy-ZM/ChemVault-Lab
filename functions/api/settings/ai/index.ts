import { requireLabRecords } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  const now = new Date().toISOString();
  return Response.json({
    provider: env.AI_PROVIDER || "deepseek",
    useOwnApiKey: false,
    hasOpenAiApiKey: Boolean(env.OPENAI_API_KEY),
    maskedOpenAiApiKey: env.OPENAI_API_KEY ? "configured" : null,
    defaultModel: env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    fallbackModel: "heuristic",
    allowUserOpenAiKeys: false,
    createdAt: now,
    updatedAt: now,
  });
};

export const onRequestPatch: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json({ error: "Lab AI settings are environment-managed." }, { status: 409 });
};
