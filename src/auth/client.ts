const tokenKey = "chemvault_lab_token_v1";
const userKey = "chemvault_lab_user_v1";

export interface LabUser {
  id?: string;
  name: string;
  email?: string;
  provider?: "lab-local" | "user-system";
}

export function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

export function getStoredUser(): LabUser | null {
  const raw = localStorage.getItem(userKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LabUser;
  } catch {
    localStorage.removeItem(userKey);
    localStorage.removeItem(tokenKey);
    return null;
  }
}

export function storeSession(token: string, user: LabUser) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  window.dispatchEvent(new Event("chemvault-lab-auth-change"));
}

export function clearSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  window.dispatchEvent(new Event("chemvault-lab-auth-change"));
}


export async function login(name: string, accessCode: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, accessCode }),
  });
  const payload = await readJson<{ token?: string; user?: LabUser; error?: string }>(response);
  if (!response.ok || !payload.token || !payload.user) {
    throw new Error(payload.error || "Login failed");
  }
  storeSession(payload.token, payload.user);
  return payload.user;
}

export async function startUserSystemLogin(next = currentPath()) {
  const response = await fetch(`/api/auth/user-system/start?next=${encodeURIComponent(next)}`);
  const payload = await readJson<{ url?: string; error?: string }>(response);
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "User System sign-in is not available");
  }
  window.location.assign(payload.url);
}

export async function completeUserSystemLogin(search: string) {
  const params = new URLSearchParams(search);
  const body = Object.fromEntries(params.entries());
  const response = await fetch("/api/auth/user-system/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await readJson<{ token?: string; user?: LabUser; next?: string; error?: string }>(response);
  if (!response.ok || !payload.token || !payload.user) {
    throw new Error(payload.error || "User System sign-in failed");
  }
  storeSession(payload.token, payload.user);
  return payload;
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

async function readJson<T extends Record<string, unknown>>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {} as T;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
