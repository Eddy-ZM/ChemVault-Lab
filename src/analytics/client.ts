import { fetchWithAuth } from "../auth/client";
import type { ProductEventName } from "./events";

export function trackProductEvent(eventName: ProductEventName, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const anonymousSessionId = analyticsSessionId();
  void fetchWithAuth("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, anonymousSessionId, properties }),
    keepalive: true,
  }).catch(() => {
    // Product analytics must never interrupt the user workflow.
  });
}

function analyticsSessionId(): string {
  const key = "chemvault_lab_analytics_session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}
