import { requireLabRecord, toDocument } from "../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, session, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  return Response.json(toDocument(record, session));
};
