import { requireLabRecords, toSearchResponse } from "../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, records } = await requireLabRecords(request, env);
  if (error) return error;
  const query = new URL(request.url).searchParams.get("q") || "";
  return Response.json(toSearchResponse(records, query));
};
