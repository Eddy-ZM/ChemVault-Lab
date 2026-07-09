import { requireLabRecords, toDocument } from "../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, session, records } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json(records.map((record) => toDocument(record, session)));
};
