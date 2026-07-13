import { fetchWithAuth } from "../auth/client";
import type { ProductEventName } from "./events";

export function trackProductEvent(eventName: ProductEventName, properties: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  void fetchWithAuth("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => {
    // Product analytics must never interrupt the user workflow.
  });
}
