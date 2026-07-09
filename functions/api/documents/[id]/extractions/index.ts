import { requireLabRecord, toReviewItems, toScientificDatabase } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  const database = toScientificDatabase([record]);
  return Response.json({
    chemicalEntities: database.chemicalEntities,
    reactions: database.reactions,
    measurements: database.measurements,
    reviewItems: toReviewItems(record),
  });
};
