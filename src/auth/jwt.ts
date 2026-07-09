import type { ChemVaultLabBindings } from "../db/bindings";

export interface LabSession {
  sub: string;
  name: string;
  email?: string;
  provider?: "lab-local" | "user-system";
  iat: number;
  exp: number;
}

export interface LabSessionIdentity {
  id: string;
  name: string;
  email?: string;
  provider?: "lab-local" | "user-system";
}

export async function createSessionToken(env: ChemVaultLabBindings, name: string) {
  return createSessionTokenForIdentity(env, {
    id: stableSubject(name),
    name,
    provider: "lab-local",
  });
}

export async function createSessionTokenForIdentity(env: ChemVaultLabBindings, identity: LabSessionIdentity) {
  const secret = requireJwtSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const session: LabSession = {
    sub: identity.id,
    name: identity.name,
    email: identity.email,
    provider: identity.provider || "lab-local",
    iat: now,
    exp: now + 60 * 60 * 24 * 14,
  };
  const header = { alg: "HS256", typ: "JWT" };
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(session)}`;
  const signature = await sign(signingInput, secret);
  return `${signingInput}.${signature}`;
}

export async function verifySessionToken(env: ChemVaultLabBindings, token: string | null): Promise<LabSession | null> {
  if (!token || !env.JWT_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = await sign(`${header}.${payload}`, env.JWT_SECRET);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as LabSession;
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function requireSession(request: Request, env: ChemVaultLabBindings) {
  const session = await verifySessionToken(env, getBearerToken(request));
  if (!session) {
    return null;
  }
  return session;
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export function isAuthConfigured(env: ChemVaultLabBindings) {
  return Boolean(env.JWT_SECRET && env.LAB_ACCESS_CODE);
}

export function verifyAccessCode(env: ChemVaultLabBindings, accessCode: string) {
  return Boolean(env.LAB_ACCESS_CODE && timingSafeEqual(accessCode, env.LAB_ACCESS_CODE));
}

function requireJwtSecret(env: ChemVaultLabBindings) {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for login");
  }
  return env.JWT_SECRET;
}

function stableSubject(name: string) {
  return `lab-user-${slugify(name || "operator")}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "operator";
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

async function sign(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
