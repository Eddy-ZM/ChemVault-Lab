# Automation

| Automation | Trigger/owner | Inputs and allowed calls | Hard guardrails | Output/failure |
| --- | --- | --- | --- | --- |
| AI enrichment | User starts analysis; Lab owns execution | Parsed document fragments; configured DeepSeek/OpenAI/Workers AI endpoint only | Server-held key, provider allowlist, stage timeout, schema validation, deterministic fallback | Structured fields plus warnings; never performs independent app writes |
| OCR | Analysis contains supported image/PDF content | File bytes; configured OCR endpoint only | File/type/size checks, server-held key, timeout | Text blocks or explicit unavailable warning |
| Event outbox | Durable state change | Versioned event envelope; configured event consumer only | D1 transaction boundary, idempotency key, bounded retries, internal drain credential | Delivered timestamp or retained retry state |
| Files artifact writeback | Successful Files-originated run | Selected export formats; Files artifact API only | Separate write credential, original owner/project context, no arbitrary URL | Files artifact identifiers or explicit failure |

Prompts steer extraction only; authorization, provider selection, schemas, rate/time limits, persistence, and side effects are enforced in code. Operators can disable providers by removing their configuration without disabling deterministic analysis.
