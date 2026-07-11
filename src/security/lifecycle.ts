import type { ChemVaultLabBindings } from "../db/bindings";

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function isValidLifecycleSecret(actual: string, expected: string): Promise<boolean> {
  if (!actual || !expected) return false;
  const [left, right] = await Promise.all([digest(actual), digest(expected)]);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    mismatch |= (left[index] || 0) ^ (right[index] || 0);
  }
  return mismatch === 0;
}

export async function authorizeLifecycleRequest(request: Request, env: ChemVaultLabBindings): Promise<Response | null> {
  const expected = env.LIFECYCLE_SERVICE_SECRET?.trim() || "";
  if (!expected) return Response.json({ error: "Lifecycle service is not configured." }, { status: 503 });
  const authorization = request.headers.get("authorization") || "";
  const actual = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!(await isValidLifecycleSecret(actual, expected))) {
    return Response.json({ error: "Invalid lifecycle service credential." }, { status: 401 });
  }
  return null;
}
