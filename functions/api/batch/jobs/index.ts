import { requireLabRecords } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";
import { listBatchJobs } from "../../../../src/storage/batchJobs";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, session } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json(await listBatchJobs(env, session!.sub));
};
