import { requireLabRecords } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";
import { createBatchJob } from "../../../../src/storage/batchJobs";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, records, session } = await requireLabRecords(request, env);
  if (error) return error;
  const batchJob = await createBatchJob(env, session!.sub, records);
  return Response.json(
    {
      batchJobId: batchJob.id,
      documents: records.length,
      estimatedTotalCostUsd: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      batchJob,
    },
    { status: 201 },
  );
};
