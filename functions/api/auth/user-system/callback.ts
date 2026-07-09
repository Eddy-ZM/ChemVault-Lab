import { createSessionTokenForIdentity } from "../../../../src/auth/jwt";
import { sanitizeLocalReturnTo, verifyUserSystemCredential } from "../../../../src/auth/userSystem";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

interface CallbackPayload {
  token?: string;
  user_token?: string;
  access_token?: string;
  code?: string;
  session?: string;
  next?: string;
}

export const onRequestPost: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  if (!env.JWT_SECRET) {
    return Response.json({ error: "JWT_SECRET is required for Lab sessions." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as CallbackPayload;
  const credential = {
    token: body.token || body.user_token || body.access_token,
    code: body.code,
    session: body.session,
  };

  try {
    const profile = await verifyUserSystemCredential(env, credential);
    const token = await createSessionTokenForIdentity(env, {
      id: `user-system:${profile.id}`,
      name: profile.name,
      email: profile.email,
      provider: "user-system",
    });

    return Response.json({
      token,
      user: {
        id: `user-system:${profile.id}`,
        name: profile.name,
        email: profile.email,
        provider: "user-system",
      },
      next: sanitizeLocalReturnTo(body.next),
    });
  } catch (caught) {
    return Response.json(
      {
        error: caught instanceof Error ? caught.message : "User System sign-in failed.",
      },
      { status: 401 },
    );
  }
};
