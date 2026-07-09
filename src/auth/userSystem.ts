import type { ChemVaultLabBindings } from "../db/bindings";

export interface UserSystemProfile {
  id: string;
  name: string;
  email?: string;
  role?: string;
  raw?: unknown;
}

export interface UserSystemCredentialInput {
  token?: string;
  code?: string;
  session?: string;
}

export function isUserSystemConfigured(env: ChemVaultLabBindings) {
  return Boolean(env.USER_SYSTEM_URL);
}

export function buildUserSystemLoginUrl(env: ChemVaultLabBindings, requestUrl: string, next?: string | null) {
  const baseUrl = getUserSystemBaseUrl(env);
  const callbackUrl = new URL("/auth/callback", requestUrl);
  callbackUrl.searchParams.set("next", sanitizeLocalReturnTo(next));

  const handoffUrl = new URL("/api/auth/handoff/start", baseUrl);
  handoffUrl.searchParams.set("returnTo", callbackUrl.toString());
  return handoffUrl.toString();
}

export async function verifyUserSystemCredential(
  env: ChemVaultLabBindings,
  credential: UserSystemCredentialInput,
): Promise<UserSystemProfile> {
  if (!isUserSystemConfigured(env)) {
    throw new Error("User System is not configured. Set USER_SYSTEM_URL.");
  }

  if (credential.code && env.USER_SYSTEM_EXCHANGE_ENDPOINT) {
    const exchanged = await exchangeUserSystemCode(env, credential.code);
    const profile = normalizeUserSystemProfile(exchanged);
    if (profile) return profile;
  }

  const token = credential.token || credential.session;
  if (!token) {
    throw new Error("User System callback did not include a token or exchange code.");
  }

  const profile = await fetchUserSystemProfile(env, token);
  if (!profile) {
    throw new Error("User System did not return a valid profile.");
  }
  return profile;
}

export function normalizeUserSystemProfile(payload: unknown): UserSystemProfile | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const user = (record.user && typeof record.user === "object" ? record.user : record) as Record<string, unknown>;
  const id = pickString(user, ["id", "sub", "user_id", "uid"]);
  const email = pickString(user, ["email", "mail"]);
  const displayName = pickString(user, ["name", "display_name", "full_name"]) || email || "ChemVault user";
  if (!id && !email) return null;

  return {
    id: id || `email:${email}`,
    name: displayName,
    email,
    role: pickString(user, ["role", "system_role"]),
    raw: payload,
  };
}

export function sanitizeLocalReturnTo(value?: string | null, fallback = "/history") {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    if (decoded === "/api" || decoded.startsWith("/api/")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

function getUserSystemBaseUrl(env: ChemVaultLabBindings) {
  const base = env.USER_SYSTEM_URL || "https://user.chemvault.science";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function exchangeUserSystemCode(env: ChemVaultLabBindings, code: string) {
  const endpoint = new URL(env.USER_SYSTEM_EXCHANGE_ENDPOINT || "/api/auth/sso/exchange", getUserSystemBaseUrl(env));
  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...clientAuthHeaders(env),
    },
    body: JSON.stringify({
      code,
      service: env.USER_SYSTEM_REQUIRED_SERVICE || "chemvault-lab",
    }),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "User System code exchange failed."));
  }
  return payload;
}

async function fetchUserSystemProfile(env: ChemVaultLabBindings, token: string) {
  const endpoint = new URL(env.USER_SYSTEM_PROFILE_ENDPOINT || "/api/auth/handoff/verify", getUserSystemBaseUrl(env));
  const response = await fetch(endpoint.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      ...clientAuthHeaders(env),
    },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "User System profile verification failed."));
  }
  return normalizeUserSystemProfile(payload);
}

function clientAuthHeaders(env: ChemVaultLabBindings) {
  const headers: Record<string, string> = {};
  if (env.USER_SYSTEM_CLIENT_ID) headers["X-ChemVault-Client-Id"] = env.USER_SYSTEM_CLIENT_ID;
  if (env.USER_SYSTEM_CLIENT_SECRET) headers["X-ChemVault-Client-Secret"] = env.USER_SYSTEM_CLIENT_SECRET;
  return headers;
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (typeof record.message === "string") return record.message;
  }
  return fallback;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
