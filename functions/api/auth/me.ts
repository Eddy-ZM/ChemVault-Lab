import { requireSession } from "../../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  const session = await requireSession(request, env);
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  return Response.json({
    authenticated: true,
    user: {
      id: session.sub,
      name: session.name,
      email: session.email,
      provider: session.provider || "lab-local",
    },
    expiresAt: session.exp,
  });
};
