import { requireLabRecord } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  return Response.json([
    {
      id: `${record.id}:chunk:summary`,
      documentId: record.id,
      chunkIndex: 0,
      section: "Experiment Summary",
      pageStart: 1,
      pageEnd: 1,
      text: record.markdown.slice(0, 4000),
      tokenCount: null,
      createdAt: record.date,
    },
  ]);
};
