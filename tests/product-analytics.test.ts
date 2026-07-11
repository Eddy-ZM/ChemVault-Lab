import { describe, expect, it } from "vitest";
import { isProductEventName, sanitizeAnalyticsProperties } from "../src/analytics/events";

describe("privacy-preserving product analytics", () => {
  it("accepts only the declared funnel events", () => {
    expect(isProductEventName("analysis_completed")).toBe(true);
    expect(isProductEventName("arbitrary_event")).toBe(false);
  });

  it("drops PII-shaped and oversized properties", () => {
    expect(sanitizeAnalyticsProperties({ fileCount: 2, email: "person@example.com", query: "private text", source: "files" }))
      .toEqual({ fileCount: 2, source: "files" });
  });
});
