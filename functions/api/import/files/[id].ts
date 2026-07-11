import { requireSession } from "../../../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env, params }) => {
  const session = await requireSession(request, env);
  if (!session) return Response.json({ error: "Sign in to import a ChemVault Files object." }, { status: 401 });
  if (!session.email) return Response.json({ error: "Your account does not have a verified email." }, { status: 403 });
  if (!env.FILES_LAB_HANDOFF_SECRET) {
    return Response.json({ error: "Files-to-Lab handoff is not configured." }, { status: 503 });
  }

  const origin = (env.FILES_SERVICE_ORIGIN || "https://file.chemvault.science").replace(/\/$/, "");
  const upstream = await fetch(`${origin}/api/internal/lab-import/${encodeURIComponent(String(params.id || ""))}`, {
    headers: {
      "x-chemvault-lab-handoff-key": env.FILES_LAB_HANDOFF_SECRET,
      "x-chemvault-user-email": session.email,
      "x-chemvault-user-id": session.sub,
    },
  });

  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, { status: upstream.status, headers });
};
