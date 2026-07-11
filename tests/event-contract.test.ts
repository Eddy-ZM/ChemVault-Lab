import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildAnalysisCompletedEvent } from "../src/events/outbox";
import type { AnalysisPipelineResult } from "../src/files/types";

describe("Lab event contract", () => {
  it("builds an absolute deep link for a completed analysis", () => {
    const result = {
      id: "analysis-1",
      createdAt: "2026-07-10T12:00:00.000Z",
      fileCount: 2,
      analysis: { experiment_summary: { experiment_title: "Titration", experiment_type: "analytical" } },
    } as AnalysisPipelineResult;
    const event = buildAnalysisCompletedEvent({ APP_BASE_URL: "https://lab.chemvault.science" }, result, "user-1");
    expect(event.type).toBe("lab.analysis.completed");
    expect(event.data.deepLink).toBe("https://lab.chemvault.science/result/analysis-1");
    expect(event.user.id).toBe("user-1");
  });

  it("matches the published v1 envelope schema", () => {
    const schema = JSON.parse(fs.readFileSync("contracts/chemvault-event-v1.schema.json", "utf8"));
    const result = {
      id: "analysis-2",
      createdAt: "2026-07-10T12:00:00.000Z",
      fileCount: 1,
      analysis: { experiment_summary: { experiment_title: "Assay", experiment_type: "analytical" } },
    } as AnalysisPipelineResult;
    const event = buildAnalysisCompletedEvent({ APP_BASE_URL: "https://lab.chemvault.science" }, result, "user-2");

    expect(schema.properties.specVersion.const).toBe(event.specVersion);
    expect(schema.properties.type.enum).toContain(event.type);
    expect(schema.properties.source.enum).toContain(event.source);
    expect(schema.required.every((field: string) => Object.hasOwn(event, field))).toBe(true);
  });
});
