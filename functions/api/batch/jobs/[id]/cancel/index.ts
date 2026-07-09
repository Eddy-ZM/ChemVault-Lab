import { requireLabRecords } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json({
    id: String(params.id || ""),
    status: "cancelled",
    message: "Lab MVP batch jobs are synchronous compatibility records; no queued worker was cancelled.",
  });
};
