# Golden-path product metrics

ChemVault Lab records a minimal, privacy-preserving funnel without IP addresses, user agents, email addresses, file names, file content, search text, or raw user IDs. Subject identifiers are one-way SHA-256 hashes using a non-exported service salt. Raw events are retained for 180 days.

## Thirty-day funnel

- Files import success: `files_import_completed / files_import_started`; initial target at least 95%.
- Analysis completion: `analysis_completed / analysis_started`; initial target at least 90%.
- Result-view activation: `result_viewed / analysis_completed`; initial target at least 80%.
- Export activation: `export_downloaded / analysis_completed`; initial target at least 35%.

The protected endpoint `/api/internal/analytics/funnel` returns event and unique-subject counts plus these conversions. It uses `LIFECYCLE_SERVICE_SECRET` because the output is operational data, not a public dashboard.

## Reliability, quality, and return usage

- Analysis reliability includes success rate, median duration, p95 duration, and categorized failures.
- Human review records corrected and rejected results; the rejection rate is a guardrail for scientific quality.
- Seven-day and thirty-day return usage counts privacy-preserving subjects active on more than one date.
- Artifact writeback success and failure counts are attached to analysis completion events.

Initial operating targets are at least 90% analysis success, p95 completion below 120 seconds, and a result rejection rate below 5%. These are beta targets, not scientific validation claims.

Metric changes should be investigated alongside service errors and outbox failures; conversion alone must not be used to infer scientific result quality.
