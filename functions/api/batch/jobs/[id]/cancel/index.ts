import { requireLabRecords } from "../../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../../src/db/bindings";
import { cancelBatchJob } from "../../../../../../src/storage/batchJobs";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, session } = await requireLabRecords(request, env);
  if (error) return error;
  const job = await cancelBatchJob(env, session!.sub, String(params.id || ""));
  if (!job) return Response.json({ error: "Batch job not found." }, { status: 404 });
  if (job.status !== "cancelled") {
    return Response.json({ error: `Batch job in ${job.status} state cannot be cancelled.`, batchJob: job }, { status: 409 });
  }
  return Response.json(job);
};
