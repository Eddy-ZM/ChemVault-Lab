import { requireLabRecords } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";
import { getBatchJob } from "../../../../../src/storage/batchJobs";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, session } = await requireLabRecords(request, env);
  if (error) return error;
  const job = await getBatchJob(env, session!.sub, String(params.id || ""));
  return job ? Response.json(job) : Response.json({ error: "Batch job not found." }, { status: 404 });
};
