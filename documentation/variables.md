# Runtime Variables

| Name/binding | Used by | Scope/source | Rotation | Failure behavior/risk |
| --- | --- | --- | --- | --- |
| `LAB_DB`, `LAB_BUCKET` | Durable records, artifacts, and owner rate-limit counters | Server Cloudflare bindings | On resource migration | Upload is rejected with 503 before content is accepted; persistence/export unavailable |
| `JWT_SECRET` | Lab session verification/signing | Server secret | Every 90 days and after exposure | Auth fails closed; coordinate rotation with active sessions |
| `BILLING_API_ORIGIN`, `BILLING_SERVICE_SECRET` | Server plan lookup | Main billing API and shared server secret | Every 90 days/incident | Enforced analysis fails before content is read if billing cannot be verified |
| `BILLING_ENFORCEMENT_MODE` | Commercial rollout gate | Server variable | Release decision | `shadow` is pre-launch only; public paid launch requires `enforce` |
| `ANALYSIS_*_DAILY_LIMIT` | Free/Pro/Team/Enterprise cost caps | Server variables | Packaging/cost review | Invalid values fall back to 3/50/250/1000 per day |
| `LAB_LOCAL_BILLING_BYPASS` | Controlled local-operator exception | Server variable | Incident/release review | Defaults false; never enable as a general customer path |
| `CHEMVAULT_USER_*` | User SSO/profile verification | Server variables/secrets | On User service/client change | Sign-in/handoff unavailable |
| `AI_PROVIDER`, `DEEPSEEK_*`, `OPENAI_API_KEY`, `AI` | Optional structured enrichment | Server provider config | Provider policy or exposure | Deterministic path remains; provider stage reports unavailable |
| `OCR_PROVIDER`, `OCR_API_KEY`, `OCR_ENDPOINT` | Optional OCR | Server provider config | Provider policy or exposure | Image/PDF OCR stage reports unavailable |
| `FILES_SERVICE_ORIGIN` | Files import/writeback target | Server variable | Service migration | Cross-product flow unavailable |
| `FILES_LAB_HANDOFF_SECRET` | Files to Lab import | Shared server secret | Every 90 days/incident | Import denied |
| `FILES_ARTIFACT_WRITE_SECRET` | Lab to Files artifact write | Shared server secret, distinct from handoff | Every 90 days/incident | Writeback denied; Lab export remains |
| `LIFECYCLE_SERVICE_SECRET` | User export/delete | Shared server secret | Every 90 days/incident | Lifecycle request denied |
| Event/analytics secrets and salts | Outbox, delivery, private funnel | Server secrets | Every 90 days/incident | Delivery/reporting fails without exposing content |

Upload limits are server-owned: 12 files, 20 MB per file, 50 MB aggregate, a 55 MB request ceiling, and plan-specific D1-backed minute/day caps. No secret may use a client-public prefix or appear in Vite output. Before go-live, configure the billing secret, switch enforcement to `enforce`, verify Free/Pro/Team deny/allow canaries, then verify D1/R2 migrations, User callback URLs, independent Files secrets, provider policy, lifecycle, and outbox delivery.
