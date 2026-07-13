import { describe, expect, it } from "vitest";
import {
  ANALYSIS_MAX_FILES,
  ANALYSIS_MAX_FILE_BYTES,
  ANALYSIS_MAX_TOTAL_BYTES,
  analysisMinuteBucket,
  validateAnalysisFiles,
} from "../src/security/analysisUpload";

describe("authenticated analysis upload boundaries", () => {
  it("rejects empty and over-count uploads", () => {
    expect(validateAnalysisFiles([])).toMatch(/at least one/i);
    expect(validateAnalysisFiles(Array.from({ length: ANALYSIS_MAX_FILES + 1 }, (_, index) => ({ name: `${index}.txt`, size: 1 }))))
      .toMatch(/at most/i);
  });

  it("rejects per-file and aggregate size overflow", () => {
    expect(validateAnalysisFiles([{ name: "large.pdf", size: ANALYSIS_MAX_FILE_BYTES + 1 }])).toMatch(/20 MB/i);
    const aggregatePart = Math.floor(ANALYSIS_MAX_TOTAL_BYTES / 3) + 1;
    expect(validateAnalysisFiles([
      { name: "a.pdf", size: aggregatePart },
      { name: "b.pdf", size: aggregatePart },
      { name: "c.pdf", size: aggregatePart },
    ])).toMatch(/50 MB/i);
  });

  it("uses stable minute buckets for rate limiting", () => {
    expect(analysisMinuteBucket(Date.parse("2026-07-12T08:23:59.999Z"))).toBe("2026-07-12T08:23:00.000Z");
  });
});
