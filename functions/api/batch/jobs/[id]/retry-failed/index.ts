import { requireLabRecords } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";
import { retryBatchJob } from "../../../../../../src/storage/batchJobs";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, session, records } = await requireLabRecords(request, env);
  if (error) return error;
  const job = await retryBatchJob(env, session!.sub, String(params.id || ""), records);
  if (!job) return Response.json({ error: "Batch job not found." }, { status: 404 });
  return Response.json(job);
};
