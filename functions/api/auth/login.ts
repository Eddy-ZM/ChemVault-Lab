import { createSessionToken, isAuthConfigured, verifyAccessCode } from "../../../src/auth/jwt";
import type { ChemVaultLabBindings } from "../../../src/db/bindings";

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  if (!isAuthConfigured(env)) {
    return Response.json(
      {
        error: "Login is not configured. Set JWT_SECRET and LAB_ACCESS_CODE.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { name?: string; accessCode?: string };
  const name = body.name?.trim() || "Lab operator";
  const accessCode = body.accessCode || "";

  if (!verifyAccessCode(env, accessCode)) {
    return Response.json({ error: "Invalid access code" }, { status: 401 });
  }

  const token = await createSessionToken(env, name);
  return Response.json({
    token,
    user: {
      name,
    },
  });
};
