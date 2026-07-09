import { requireSession } from "../../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../../src/db/bindings";
import { deletePersistedAnalysis } from "../../../src/storage/serverStore";

export const onRequestDelete: PagesFunction<ChemVaultLabBindings> = async ({ request, params, env }) => {
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const id = String(params.id || "");
  if (!id) {
    return Response.json({ error: "Analysis id is required." }, { status: 400 });
  }

  const deleted = await deletePersistedAnalysis(env, id, session.sub);
  if (!deleted) {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }

  return Response.json({ deleted: true, id });
};
