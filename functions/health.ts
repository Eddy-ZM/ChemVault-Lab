import type { ChemVaultLabBindings } from "../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ env }) =>
  Response.json({
    ok: true,
    service: "chemvault-lab",
    mergedFrom: "chemvault-extract",
    apiBase: "/api",
    runtime: {
      aiBinding: envHasAi(env),
      ocrProvider: env.OCR_PROVIDER || "basic",
      d1Binding: Boolean(env.LAB_DB),
      r2Binding: Boolean(env.LAB_BUCKET),
    },
  });

function envHasAi(env?: ChemVaultLabBindings) {
  return Boolean(env?.AI?.toMarkdown);
}
