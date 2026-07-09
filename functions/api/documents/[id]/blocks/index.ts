import { requireLabRecord } from "../../../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const { error, record } = await requireLabRecord(request, env, String(params.id || ""));
  if (error) return error;
  const summary = record.analysis.experiment_summary;
  return Response.json([
    {
      id: `${record.id}:block:summary`,
      documentId: record.id,
      pageNumber: 1,
      blockType: "text",
      section: "Experiment Summary",
      text: `${summary.experiment_title}\n${summary.aim}`,
      html: null,
      bbox: null,
      metadata: { experimentType: summary.experiment_type },
      createdAt: record.date,
    },
    ...record.analysis.raw_data.tables.map((table, index) => ({
      id: `${record.id}:block:table:${index}`,
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
  ]);
};
