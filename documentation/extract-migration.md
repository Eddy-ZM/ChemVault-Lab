# Extract transition and late-discovery procedure

ChemVault Lab is the canonical home for all former Extract product journeys. The 2026-07-12 operational inventory found no production Extract database, object store, queue, billing configuration, or resolvable legacy API to migrate. Consequently, no user data was fabricated, copied, or deleted during the cutover.

## Current transition

- New uploads, extraction, normalization, review, search, exports, batch work, and Files writeback run in Lab.
- Compatibility endpoints use the authenticated Lab session subject as the owner; callers cannot select another owner in a request body or query string.
- The old browser application redirects equivalent product paths to Lab after its next Git-backed deployment.

## If legacy data is discovered later

1. Freeze the environment in read-only mode and record its account, region, database, object store, queue, and billing owner.
2. Call Extract's protected `/internal/sunset/census` endpoint and resolve non-zero subscriptions, open jobs, and pending exports.
3. Call `/internal/lifecycle/{userSystemId}` with `action=export` for each affected owner. Store the response in encrypted, access-controlled evidence storage and record its SHA-256 checksum.
4. Reconcile every `objectInventory` entry with the legacy object store. The lifecycle JSON intentionally reports `contentIncluded=false`; source objects must be handled separately when they exist.
5. Map only verified records into Lab. Preserve the original Extract identifiers and timestamps as provenance; never infer missing scientific values.
6. Have the owner verify counts and representative records in Lab. Keep the legacy export read-only through the approved retention window.
7. Run lifecycle deletion only after workspace transfer, subscription cancellation, export verification, object reconciliation, and explicit deletion approval.

The lifecycle secret is service-only. It must never be exposed to a browser, committed to Git, or reused as a user session token.
