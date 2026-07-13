# Architecture

## Product and stack

ChemVault Lab is the canonical successor to ChemVault Extract. The React/Vite browser accepts laboratory files, while Cloudflare Pages Functions run deterministic parsing, optional OCR/AI enrichment, review, export, lifecycle, analytics, and Extract-compatible APIs. Authenticated analysis metadata is stored in D1 and source/export artifacts in R2.

## Identity and trust boundaries

- Upload and analysis require a ChemVault User session. The server verifies it before reading multipart content and derives the owner from the verified session; client-supplied owner IDs are ignored.
- The server resolves the owner's subscription from the main ChemVault billing authority before reading multipart content. Browser plan claims never set provider quotas.
- Files handoff and artifact writeback use separate service credentials from the browser session.
- AI/OCR keys, lifecycle credentials, analytics salts, and event-delivery credentials remain server-side.
- Extract-compatible routes translate legacy contracts onto Lab-owned records; they do not proxy to the retired Extract backend.

## Known risks and assumptions

- D1 and R2 bindings are required for durable authenticated operation; absence must not be presented as saved work.
- Anonymous/local fallback analysis is intentionally disabled so provider, quota, and persistence failures remain visible.
- Production commercial launch requires billing enforcement mode `enforce`; `shadow` exists only for the pre-launch rollout sequence.
- Provider output is untrusted and remains reviewable before export or Files writeback.
- Extract shutdown is complete only after public entry points redirect and legacy customer data has an explicit export/retention decision.

There is no transactional email or scheduled cron job in this repository. AI, OCR, outbox, event, and service-to-service behavior is documented in `automation.md`.

## Related documents

- [Critical flows](flows.md)
- [Permissions](permissions.md)
- [Runtime variables](variables.md)
- [Verification map](tests.md)
- [Automation](automation.md)
