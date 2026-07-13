import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analysisLimitsForPlan,
  billingEnforcementMode,
  resolveBillingEntitlements,
} from "../src/security/billingEntitlements";
import { consumeAnalysisRateLimit } from "../src/security/analysisUpload";

afterEach(() => {
  vi.unstubAllGlobals();
});

class RateLimitD1 {
  readonly counts = new Map<string, number>();

  prepare(sql: string) {
    let values: unknown[] = [];
    const statement = {
      bind: (...nextValues: unknown[]) => {
        values = nextValues;
        return statement;
      },
      first: async () => {
        if (!sql.includes("INSERT INTO lab_analysis_rate_limits")) return null;
        const id = String(values[0]);
        const count = (this.counts.get(id) || 0) + 1;
        this.counts.set(id, count);
        return { request_count: count };
      },
      run: async () => ({ success: true }),
    };
    return statement;
  }
}

describe("Lab billing entitlements", () => {
  it("maps plans to bounded analysis throughput and daily usage", () => {
    expect(analysisLimitsForPlan("free", {})).toEqual({ perMinute: 2, perDay: 3 });
    expect(analysisLimitsForPlan("pro", {})).toEqual({ perMinute: 10, perDay: 50 });
    expect(analysisLimitsForPlan("team", {})).toEqual({ perMinute: 30, perDay: 250 });
  });

  it("defaults production to enforcement and local development to shadow mode", () => {
    expect(billingEnforcementMode({ NODE_ENV: "production" })).toBe("enforce");
    expect(billingEnforcementMode({ NODE_ENV: "development" })).toBe("shadow");
  });

  it("fails closed when production billing is not configured", async () => {
    await expect(resolveBillingEntitlements({ NODE_ENV: "production" }, "user_1")).rejects.toMatchObject({
      status: 503,
      code: "BILLING_UNAVAILABLE",
    });
  });

  it("accepts only the plan resolved for the requested user", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      userId: "user_1",
      plan: "team",
      features: {},
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveBillingEntitlements({
      NODE_ENV: "production",
      BILLING_SERVICE_SECRET: "server_secret",
    }, "user_1");

    expect(result).toEqual({ plan: "team", source: "billing", enforced: true });
    const request = fetchMock.mock.calls[0];
    expect(String(request[0])).toContain("userId=user_1");
    expect(new Headers(request[1]?.headers).get("authorization")).toBe("Bearer server_secret");
  });

  it("enforces minute bursts and daily quota with atomic D1 buckets", async () => {
    const db = new RateLimitD1();
    const limits = analysisLimitsForPlan("free", {});
    const start = Date.parse("2026-07-13T09:00:00.000Z");

    expect((await consumeAnalysisRateLimit(db as unknown as D1Database, "user_1", limits, start)).allowed).toBe(true);
    expect((await consumeAnalysisRateLimit(db as unknown as D1Database, "user_1", limits, start + 1_000)).allowed).toBe(true);
    expect(await consumeAnalysisRateLimit(db as unknown as D1Database, "user_1", limits, start + 2_000)).toMatchObject({
      allowed: false,
      scope: "minute",
    });
    expect((await consumeAnalysisRateLimit(db as unknown as D1Database, "user_1", limits, start + 60_000)).allowed).toBe(true);
    expect(await consumeAnalysisRateLimit(db as unknown as D1Database, "user_1", limits, start + 120_000)).toMatchObject({
      allowed: false,
      scope: "daily",
    });
  });
});
