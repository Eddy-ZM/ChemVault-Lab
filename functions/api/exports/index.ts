import { requireLabRecords } from "../../../src/api/extractCompat";
import type { ChemVaultLabBindings } from "../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, records } = await requireLabRecords(request, env);
  if (error) return error;
  return Response.json(
    records.flatMap((record) =>
      (["xlsx", "json", "markdown", "latex"] as const).map((format) => ({
        id: `${record.id}:${format}`,
        projectId: "chemvault-lab",
        status: "completed",
        exportFormat: format,
        storageKey: null,
        downloadUrl: `/api/download/${record.id}/${format}`,
        error: null,
        createdAt: record.date,
        updatedAt: record.date,
      })),
    ),
  );
};

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const { error, records } = await requireLabRecords(request, env);
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { documentId?: string; analysisId?: string; exportFormat?: string };
  const id = body.documentId || body.analysisId || records[0]?.id;
  const format = body.exportFormat || "xlsx";
  const record = records.find((item) => item.id === id);
  if (!record) return Response.json({ error: "Lab analysis not found." }, { status: 404 });
  return Response.json(
    {
      id: `${record.id}:${format}`,
      projectId: "chemvault-lab",
      status: "completed",
      exportFormat: format,
      storageKey: null,
      downloadUrl: `/api/download/${record.id}/${format}`,
      error: null,
      createdAt: record.date,
      updatedAt: new Date().toISOString(),
    },
    { status: 201 },
  );
};
