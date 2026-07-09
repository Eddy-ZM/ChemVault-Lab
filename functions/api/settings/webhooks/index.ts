import { jsonUnsupported, requireLabRecords } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json([]);
};

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async () =>
  jsonUnsupported("Webhooks are not part of the merged ChemVault Lab MVP.");
