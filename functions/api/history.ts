import { requireSession } from "../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../src/db/bindings";
import { listPersistedHistory } from "../../src/storage/serverStore";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const records = await listPersistedHistory(env, session.sub);
  return Response.json({ records });
};
