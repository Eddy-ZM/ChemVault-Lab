import { jsonUnsupported, requireLabRecords } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json({
    provider: "deepseek",
    configuredByEnvironment: true,
    userProvidedOpenAiKey: false,
    message: "ChemVault Lab uses the DeepSeek adapter by default. Other providers remain adapter placeholders.",
  });
};

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("User-supplied OpenAI keys are not enabled in ChemVault Lab. Configure provider keys through environment variables.");
