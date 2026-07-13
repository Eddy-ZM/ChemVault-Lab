# Verification Map

## Existing coverage

| Use case | Rule and negative case | Evidence | Status |
| --- | --- | --- | --- |
| Parse/analyse/export | Supported fixtures produce stable structured output; invalid input is rejected | `tests/pipeline.test.ts`; production build | CI required |
| Event contract/outbox | Events match the versioned schema and retries remain idempotent | `tests/event-contract.test.ts`; outbox implementation | CI required |
| Lifecycle | Export/delete requires service authority and repeated deletion is safe | `tests/lifecycle.test.ts` | CI required |
| Analytics | Only allowlisted, privacy-minimized properties are accepted | `tests/product-analytics.test.ts` | CI required |
| Upload authorization and limits | Anonymous access, excessive count/size, and invalid rate buckets are rejected before analysis | `tests/analysis-security.test.ts` | CI required |
| Owner scope and compatibility | Server functions derive session ownership; legacy endpoints use Lab records | `tests/extract-cutover.test.ts`; TypeScript build | CI required |

## Proposed tests

| Test | Type | Expected result |
| --- | --- | --- |
| Files → Lab → Files → Notifications deployed canary | Guarded live | Clean owner file produces owner-scoped result, artifact, and one idempotent event |
| Extract-route parity corpus | Automated integration | Representative legacy requests match documented Lab contracts; unsupported writes are explicit |
| Provider timeout/redaction | Automated integration | Provider timeout preserves deterministic result and no secret/content reaches logs |
| D1/R2 unavailable | Automated integration | Authenticated save is reported failed, never silently local-only |

## Gaps

- The verified Cloudflare/GitHub scope contained no production Extract data plane; a separately managed legacy environment, if discovered later, still requires the documented census and retention procedure.
- Workspace/team compatibility routes are intentionally informational until a canonical team entitlement model exists.
- The local gate currently passes 38 tests plus `npm run lint` and `npm run build`; production provider, Files writeback, and lifecycle bindings still require guarded canaries.
