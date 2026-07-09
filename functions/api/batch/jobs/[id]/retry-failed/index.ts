import { requireLabRecords } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json({
    id: String(params.id || ""),
    status: "completed",
    retriedFailedItems: 0,
    message: "No failed queued batch items exist in the Lab MVP compatibility layer.",
  });
};
