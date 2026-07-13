import { describe, expect, it } from "vitest";
import { isProductEventName, sanitizeAnalyticsProperties } from "../src/analytics/events";

describe("privacy-preserving product analytics", () => {
  it("accepts only the declared funnel events", () => {
    expect(isProductEventName("analysis_completed")).toBe(true);
    expect(isProductEventName("arbitrary_event")).toBe(false);
  });

  it("drops PII-shaped and oversized properties", () => {
    expect(sanitizeAnalyticsProperties("analysis_started", { fileCount: 2, email: "person@example.com", query: "private text", source: "files" }))
      .toEqual({ fileCount: 2, source: "files" });
  });

  it("rejects unknown properties and PII hidden under an innocent key", () => {
    expect(sanitizeAnalyticsProperties("analysis_started", {
      source: "person@example.com",
      note: "private laboratory text",
      fileCount: 2,
    })).toEqual({ fileCount: 2 });
  });

  it("enforces event-specific enum and numeric ranges", () => {
    expect(sanitizeAnalyticsProperties("export_downloaded", { format: "pdf", source: "result" })).toEqual({});
    expect(sanitizeAnalyticsProperties("review_corrected", { hasExtractedData: true, hasReason: false, reason: "private" }))
      .toEqual({ hasExtractedData: true, hasReason: false });
  });
});
