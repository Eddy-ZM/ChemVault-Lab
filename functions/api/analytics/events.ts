import { requireSession } from "../../../src/auth/jwt";
import { isProductEventName, recordProductEvent } from "../../../src/analytics/events";
import type { ChemVaultLabBindings } from "../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !isProductEventName(body.eventName)) {
    return Response.json({ error: "Unsupported product event." }, { status: 400 });
  }
  const session = await requireSession(request, env);
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  const stored = await recordProductEvent(env, {
    eventName: body.eventName,
    subjectId: session.sub,
    properties: body.properties && typeof body.properties === "object" ? body.properties as Record<string, unknown> : {},
  });
  return Response.json({ accepted: true, stored }, { status: 202 });
};
