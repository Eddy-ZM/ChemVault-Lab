import { requireLabRecords, toUsage } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, records } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json({
    subscription: null,
    planLimits: {
      plan: "lab",
      monthlyAiFileLimit: 1000,
      monthlyAiCostLimitUsd: 0,
      maxProjects: 1,
      maxDocuments: 1000,
      maxStorageMb: 1024,
      canUseOwnApiKey: false,
      canExport: true,
      canBatchExtract: true,
      teamMembers: 1,
    },
    usage: toUsage(records),
  });
};
