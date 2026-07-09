import { requireLabRecords } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, records } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json(
    {
      batchJobId: `lab-batch-${Date.now()}`,
      documents: records.length,
      estimatedTotalCostUsd: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      batchJob: {
        id: `lab-batch-${Date.now()}`,
        projectId: "chemvault-lab",
        workspaceId: null,
        userId: "chemvault-lab-user",
        type: "ai_extraction",
        status: "completed",
        totalItems: records.length,
        completedItems: records.length,
        failedItems: 0,
        progress: 1,
        error: null,
        estimatedTotalCostUsd: 0,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
};
