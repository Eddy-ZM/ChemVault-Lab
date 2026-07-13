import type { ChemVaultLabBindings } from "../db/bindings";

export type BillingPlan = "anonymous" | "free" | "pro" | "team" | "enterprise" | "admin";
export type BillingEnforcementMode = "off" | "shadow" | "enforce";

export interface BillingEntitlements {
  plan: BillingPlan;
  source: "billing" | "privileged" | "disabled" | "fallback";
  enforced: boolean;
}

export interface AnalysisPlanLimits {
  perMinute: number;
  perDay: number;
}

export class BillingEntitlementError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "BillingEntitlementError";
    this.status = status;
    this.code = code;
  }
}

const validPlans = new Set<BillingPlan>(["anonymous", "free", "pro", "team", "enterprise", "admin"]);
const defaultLimits: Record<BillingPlan, AnalysisPlanLimits> = {
  anonymous: { perMinute: 0, perDay: 0 },
  free: { perMinute: 2, perDay: 3 },
  pro: { perMinute: 10, perDay: 50 },
  team: { perMinute: 30, perDay: 250 },
  enterprise: { perMinute: 60, perDay: 1000 },
  admin: { perMinute: 120, perDay: 5000 },
};

export async function resolveBillingEntitlements(
  env: ChemVaultLabBindings,
  userId: string,
  { privileged = false }: { privileged?: boolean } = {},
): Promise<BillingEntitlements> {
  if (privileged) return { plan: "admin", source: "privileged", enforced: true };
  const mode = billingEnforcementMode(env);
  if (mode === "off") return { plan: "free", source: "disabled", enforced: false };

  const cleanUserId = userId.trim();
  const secret = env.BILLING_SERVICE_SECRET?.trim() || "";
  if (!cleanUserId || !secret) {
    if (mode === "enforce") {
      throw new BillingEntitlementError(
        cleanUserId ? "Billing entitlement service is not configured." : "Verified billing identity is required.",
        cleanUserId ? 503 : 401,
        cleanUserId ? "BILLING_UNAVAILABLE" : "BILLING_IDENTITY_REQUIRED",
      );
    }
    return { plan: "free", source: "fallback", enforced: false };
  }

  let response: Response;
  try {
    response = await fetch(`${billingOrigin(env)}/api/internal/billing/entitlements?userId=${encodeURIComponent(cleanUserId)}`, {
      headers: { accept: "application/json", authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    if (mode === "enforce") throw new BillingEntitlementError("Billing entitlement service is unavailable.", 503, "BILLING_UNAVAILABLE");
    return { plan: "free", source: "fallback", enforced: false };
  }

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const plan = normalizePlan(payload?.plan);
  if (!response.ok || payload?.ok !== true || payload?.userId !== cleanUserId || !plan) {
    if (mode === "enforce") throw new BillingEntitlementError("Billing entitlement could not be verified.", 503, "BILLING_INVALID_RESPONSE");
    return { plan: "free", source: "fallback", enforced: false };
  }
  return { plan, source: "billing", enforced: mode === "enforce" };
}

export function analysisLimitsForPlan(plan: BillingPlan, env: ChemVaultLabBindings): AnalysisPlanLimits {
  const limits = defaultLimits[plan];
  const dailyOverride = plan === "free"
    ? env.ANALYSIS_FREE_DAILY_LIMIT
    : plan === "pro"
      ? env.ANALYSIS_PRO_DAILY_LIMIT
      : plan === "team"
        ? env.ANALYSIS_TEAM_DAILY_LIMIT
        : plan === "enterprise" || plan === "admin"
          ? env.ANALYSIS_ENTERPRISE_DAILY_LIMIT
          : undefined;
  return { ...limits, perDay: positiveInteger(dailyOverride) ?? limits.perDay };
}

export function billingEnforcementMode(env: ChemVaultLabBindings): BillingEnforcementMode {
  const configured = env.BILLING_ENFORCEMENT_MODE?.trim().toLowerCase();
  if (configured === "off" || configured === "shadow" || configured === "enforce") return configured;
  return env.NODE_ENV?.trim().toLowerCase() === "production" ? "enforce" : "shadow";
}

function billingOrigin(env: ChemVaultLabBindings): string {
  const raw = (env.BILLING_API_ORIGIN || "https://chemvault.science").trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BillingEntitlementError("Billing API origin is invalid.", 503, "BILLING_UNAVAILABLE");
  }
  if (env.NODE_ENV?.trim().toLowerCase() === "production" && url.protocol !== "https:") {
    throw new BillingEntitlementError("Billing API origin must use HTTPS.", 503, "BILLING_UNAVAILABLE");
  }
  return url.toString().replace(/\/+$/, "");
}

function normalizePlan(value: unknown): BillingPlan | null {
  if (typeof value !== "string") return null;
  const plan = value.trim().toLowerCase() as BillingPlan;
  return validPlans.has(plan) ? plan : null;
}

function positiveInteger(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
