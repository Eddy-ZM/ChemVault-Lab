import { requireLabRecord } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  return Response.json([
    {
      id: `${record.id}:summary`,
      documentId: record.id,
      pageNumber: 1,
      text: record.markdown,
      imageKey: null,
      width: null,
      height: null,
      metadata: { source: "chemvault-lab" },
      createdAt: record.date,
    },
  ]);
};
