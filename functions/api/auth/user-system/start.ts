import { buildUserSystemLoginUrl, isUserSystemConfigured, sanitizeLocalReturnTo } from "../../../../src/auth/userSystem";
import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  if (!isUserSystemConfigured(env)) {
    return Response.json({ error: "User System is not configured. Set USER_SYSTEM_URL." }, { status: 503 });
  }

  const url = new URL(request.url);
  const next = sanitizeLocalReturnTo(url.searchParams.get("next"));
  const loginUrl = buildUserSystemLoginUrl(env, request.url, next);
  if (url.searchParams.get("redirect") === "1") {
    return Response.redirect(loginUrl, 302);
  }

  return Response.json({ url: loginUrl, next });
};
