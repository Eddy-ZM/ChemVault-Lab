import type { ChemVaultLabBindings } from "../../../../src/db/bindings";
import { requireSession } from "../../../../src/auth/jwt";
import { recordProductEvent } from "../../../../src/analytics/events";

export const onRequestPatch: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const session = await requireSession(request, env);
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const status = typeof body.status === "string" ? body.status : "pending";
  if (status === "corrected" || status === "rejected") {
    await recordProductEvent(env, {
      eventName: status === "corrected" ? "review_corrected" : "result_rejected",
      subjectId: session.sub,
      properties: {
        hasExtractedData: Boolean(body.extractedData),
        hasReason: typeof body.reason === "string" && body.reason.trim().length > 0,
      },
    });
  }
  return Response.json({
    id: String(params.id || ""),
    status,
    extractedData: body.extractedData || null,
    updatedAt: new Date().toISOString(),
    note: "Review item persistence has moved to ChemVault Lab analysis records.",
  });
};
