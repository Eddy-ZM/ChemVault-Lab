import { requireLabRecords } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, records } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json({
    requestsThisMonth: 0,
    apiKeysActive: 0,
    extractionJobsCreatedByApi: records.length,
    estimatedAiCostUsd: 0,
    rateLimit: {
      per_minute: 60,
      per_day: 1000,
    },
  });
};
