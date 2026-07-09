import { requireLabRecord } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  return Response.json(
    record.analysis.raw_data.tables.map((table, index) => ({
      id: `${record.id}:table:${index}`,
      documentId: record.id,
      pageNumber: null,
      blockType: "table",
      section: table.table_name,
      text: JSON.stringify(table.rows),
      html: null,
      bbox: null,
      metadata: { columns: table.columns, sourceReference: table.source_reference },
      createdAt: record.date,
    })),
  );
};
