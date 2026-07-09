import { jsonUnsupported, requireLabRecords } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestPatch: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return jsonUnsupported("Workspace member editing is reserved for the next ChemVault Lab workspace phase.");
};

export const onRequestDelete: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return jsonUnsupported("Workspace member removal is reserved for the next ChemVault Lab workspace phase.");
};
