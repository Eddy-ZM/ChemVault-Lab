import type { ChemVaultLabBindings } from "../../../../src/db/bindings";

interface FunnelRow {
  event_name: string;
  events: number;
  subjects: number;
}

interface TimedEventRow {
  event_name: string;
  properties_json: string;
}

export const onRequestGet: PagesFunction<ChemVaultLabBindings> = async ({ request, env }) => {
  if (!env.LIFECYCLE_SERVICE_SECRET || request.headers.get("x-chemvault-lifecycle-key") !== env.LIFECYCLE_SERVICE_SECRET) {
    return Response.json({ error: "Unauthorized analytics read." }, { status: 401 });
  }
  if (!env.LAB_DB) return Response.json({ error: "Analytics database is unavailable." }, { status: 503 });

  const retentionCutoff = new Date(Date.now() - 180 * 86_400_000).toISOString();
  await env.LAB_DB.prepare("DELETE FROM lab_product_events WHERE occurred_at < ?").bind(retentionCutoff).run();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [result, timedEvents, activeDays] = await Promise.all([
    env.LAB_DB.prepare(
      `SELECT event_name, COUNT(*) AS events, COUNT(DISTINCT subject_hash) AS subjects
         FROM lab_product_events
        WHERE occurred_at >= ?
        GROUP BY event_name`,
    ).bind(since).all<FunnelRow>(),
    env.LAB_DB.prepare(
      `SELECT event_name, properties_json
         FROM lab_product_events
        WHERE occurred_at >= ? AND event_name IN ('analysis_completed', 'analysis_failed')`,
    ).bind(since).all<TimedEventRow>(),
    env.LAB_DB.prepare(
      `SELECT subject_hash, COUNT(DISTINCT substr(occurred_at, 1, 10)) AS active_days,
              MIN(occurred_at) AS first_seen, MAX(occurred_at) AS last_seen
         FROM lab_product_events
        WHERE occurred_at >= ?
        GROUP BY subject_hash`,
    ).bind(since).all<{ subject_hash: string; active_days: number; first_seen: string; last_seen: string }>(),
  ]);
  const metrics = Object.fromEntries((result.results || []).map((row) => [row.event_name, {
    events: Number(row.events),
    subjects: Number(row.subjects),
  }]));
  const subjects = (name: string) => Number((metrics[name] as { subjects?: number } | undefined)?.subjects || 0);
  const ratio = (numerator: number, denominator: number) => denominator ? Number((numerator / denominator).toFixed(4)) : null;
  const durations = (timedEvents.results || [])
    .map((row) => readNumberProperty(row.properties_json, "durationMs"))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  const failureCategories: Record<string, number> = {};
  for (const row of timedEvents.results || []) {
    if (row.event_name !== "analysis_failed") continue;
    const category = readStringProperty(row.properties_json, "failureCategory") || "unknown";
    failureCategories[category] = (failureCategories[category] || 0) + 1;
  }
  const returningSubjects = (activeDays.results || []).filter((row) => Number(row.active_days) >= 2).length;
  const sevenDayCutoff = Date.now() - 7 * 86_400_000;
  const sevenDayEligible = (activeDays.results || []).filter((row) => Date.parse(row.first_seen) <= sevenDayCutoff);
  const sevenDayReturning = sevenDayEligible.filter((row) => Number(row.active_days) >= 2 && Date.parse(row.last_seen) > Date.parse(row.first_seen)).length;

  return Response.json({
    windowDays: 30,
    generatedAt: new Date().toISOString(),
    metrics,
    conversion: {
      filesImportSuccess: ratio(subjects("files_import_completed"), subjects("files_import_started")),
      analysisCompletion: ratio(subjects("analysis_completed"), subjects("analysis_started")),
      resultViewAfterCompletion: ratio(subjects("result_viewed"), subjects("analysis_completed")),
      exportAfterCompletion: ratio(subjects("export_downloaded"), subjects("analysis_completed")),
    },
    reliability: {
      analysisSuccessRate: ratio(subjects("analysis_completed"), subjects("analysis_started")),
      durationMs: {
        samples: durations.length,
        median: percentile(durations, 0.5),
        p95: percentile(durations, 0.95),
      },
      failureCategories,
    },
    quality: {
      correctedSubjects: subjects("review_corrected"),
      rejectedSubjects: subjects("result_rejected"),
      rejectionRate: ratio(subjects("result_rejected"), subjects("analysis_completed")),
    },
    returnUsage: {
      thirtyDaySubjects: activeDays.results?.length || 0,
      thirtyDayReturningSubjects: returningSubjects,
      thirtyDayReturnRate: ratio(returningSubjects, activeDays.results?.length || 0),
      sevenDayEligibleSubjects: sevenDayEligible.length,
      sevenDayReturningSubjects: sevenDayReturning,
      sevenDayReturnRate: ratio(sevenDayReturning, sevenDayEligible.length),
    },
  });
};

function readNumberProperty(value: string, key: string): number | null {
  try {
    const item = JSON.parse(value || "{}")[key];
    return typeof item === "number" && Number.isFinite(item) ? item : null;
  } catch {
    return null;
  }
}

function readStringProperty(value: string, key: string): string | null {
  try {
    const item = JSON.parse(value || "{}")[key];
    return typeof item === "string" ? item : null;
  } catch {
    return null;
  }
}

function percentile(values: number[], quantile: number): number | null {
  if (!values.length) return null;
  return values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * quantile) - 1))];
}
