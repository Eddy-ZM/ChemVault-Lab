const tokenKey = "chemvault_lab_token_v1";
const userKey = "chemvault_lab_user_v1";
const guestModeKey = "chemvault_lab_guest_mode_v1";

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
  return raw ? (JSON.parse(raw) as LabUser) : null;
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

export function enableGuestMode() {
  sessionStorage.setItem(guestModeKey, "1");
}

export function hasGuestMode() {
  return sessionStorage.getItem(guestModeKey) === "1";
}

export async function login(name: string, accessCode: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, accessCode }),
  });
  const payload = (await response.json()) as { token?: string; user?: LabUser; error?: string };
  if (!response.ok || !payload.token || !payload.user) {
    throw new Error(payload.error || "Login failed");
  }
  storeSession(payload.token, payload.user);
  return payload.user;
}

export async function startUserSystemLogin(next = currentPath()) {
  const response = await fetch(`/api/auth/user-system/start?next=${encodeURIComponent(next)}`);
  const payload = (await response.json()) as { url?: string; error?: string };
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
  const payload = (await response.json()) as { token?: string; user?: LabUser; next?: string; error?: string };
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
