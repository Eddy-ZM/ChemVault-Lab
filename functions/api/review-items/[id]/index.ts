import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestPatch: PagesFunction<ChemVaultLabBindings> = async ({ request, params }) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return Response.json({
    id: String(params.id || ""),
    status: typeof body.status === "string" ? body.status : "pending",
    extractedData: body.extractedData || null,
    updatedAt: new Date().toISOString(),
    note: "Review item persistence has moved to ChemVault Lab analysis records.",
  });
};
