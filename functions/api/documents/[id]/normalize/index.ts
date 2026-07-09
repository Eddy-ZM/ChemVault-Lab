import { requireLabRecord, toReviewItems } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  const reviewItems = toReviewItems(record);
  return Response.json(
    {
      status: "completed",
      updatedRecords: reviewItems.length,
      reviewItems,
    },
    { status: 201 },
  );
};
