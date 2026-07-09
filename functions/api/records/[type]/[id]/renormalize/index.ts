import { jsonUnsupported, requireLabRecords } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return jsonUnsupported("Record renormalization is not part of the merged Lab MVP. Re-run the Lab analysis to regenerate structured data.");
};
