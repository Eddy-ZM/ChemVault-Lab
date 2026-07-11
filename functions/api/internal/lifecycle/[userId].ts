import { authorizeLifecycleRequest } from "../../../../src/security/lifecycle";
import { deleteAllPersistedUserData, exportPersistedUserData } from "../../../../src/storage/serverStore";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

interface LifecycleBody {
  action?: "export" | "delete";
  requestId?: string;
}

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const unauthorized = await authorizeLifecycleRequest(request, env);
  if (unauthorized) return unauthorized;

  const userId = String(params.userId || "").trim();
  if (!userId) return Response.json({ error: "User id is required." }, { status: 400 });

  const body = await request.json<LifecycleBody>().catch(() => null);
  if (!body || (body.action !== "export" && body.action !== "delete")) {
    return Response.json({ error: "Lifecycle action must be export or delete." }, { status: 400 });
  }

  if (body.action === "export") {
    const data = await exportPersistedUserData(env, userId);
    return Response.json({ ok: true, service: "lab", requestId: body.requestId || null, data });
  }

  const deleted = await deleteAllPersistedUserData(env, userId);
  return Response.json({ ok: true, service: "lab", requestId: body.requestId || null, deleted });
};
