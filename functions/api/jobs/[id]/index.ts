import { requireLabRecords, toJob } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, records } = await requireLabRecords(request, env);
  if (error) return error;
  const job = records.map((record) => toJob(record)).find((item) => item.id === String(params.id || ""));
  return job ? Response.json(job) : Response.json({ error: "Job not found." }, { status: 404 });
};
