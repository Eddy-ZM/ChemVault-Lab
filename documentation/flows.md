# Critical Flows

| Flow | Actor and precondition | Protected sequence and side effects | Deny/failure behavior |
| --- | --- | --- | --- |
| Direct analysis | Signed-in owner with accepted files | Session is verified before reading the body; server enforces 12 files, 20 MB per file, 50 MB aggregate, a 55 MB request ceiling, and 5 analyses per owner per minute; it then parses, runs configured providers, writes D1/R2, and returns an owner-scoped record ID | Anonymous, oversized, over-count, rate-limited, or unbound-storage requests fail before analysis; no local heuristic result is substituted |
| Files to Lab | Signed-in Files owner with a scan-clean object | Files signs a handoff; Lab verifies email and handoff secret, loads the object, derives the owner from the session, and persists the run | Missing session, mismatched owner, unclean file, or invalid handoff is denied |
| Review decision | Record owner | Owner-scoped record is loaded; correction/accept/reject state is written; an allowlisted analytics event is recorded | Unknown record or different owner returns not found/unauthorized; client owner ID is ignored |
| Export/writeback | Record owner; optional Files origin | Server generates JSON/Markdown/LaTeX/XLSX; direct download is owner-scoped; Files artifacts use a separate write credential | No artifact is reported saved until the downstream write succeeds; failure leaves the Lab result available |
| Extract compatibility | Authenticated legacy client | Compatibility route maps projects/documents/jobs/search/export requests onto Lab records | Unsupported legacy mutations return an explicit error; no request falls through to the retired Extract API |
| Lifecycle deletion/export | User Center service | Internal credential authorizes owner-scoped export or deletion and returns a terminal result | Missing/mismatched credential fails closed; deletion is idempotent |

Trust crossings are browser to Pages Functions, User to Lab, Files to Lab, Lab to AI/OCR providers, Lab to Files, and outbox to Notifications/event consumers.
