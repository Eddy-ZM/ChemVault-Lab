# Permissions

Owner scope comes from the verified JWT/session subject, not request JSON or query parameters. D1 has no row-level-security layer, so every protected query must include the derived owner ID.

| Resource / operation | Guest | Signed-in owner | Other user | Files service | User/lifecycle operator |
| --- | --- | --- | --- | --- | --- |
| Upload/analyse files | Deny; sign-in required before request body is accepted | Allow within server-resolved plan, daily/burst, file, aggregate, and count limits | Deny | Handoff only | Deny |
| Persist/list/read Lab record | Deny | Allow own records | Deny | Handoff only | Lifecycle scope only |
| Review/correct/export | Deny | Allow own records | Deny | Deny | Export/delete reconciliation only |
| Import Files object | Deny | Allow with valid Files handoff | Deny | Signs handoff | Deny |
| Write derived Files artifact | Deny | Initiates for own run | Deny | Accepts service credential | Deny |
| Funnel report/outbox drain | Deny | Deny | Deny | Deny | Internal credential only |
| Lifecycle export/delete | Deny | Through User Center | Deny | Deny | Internal credential only |

AI/OCR providers receive only the content needed for the selected analysis. API keys, billing-service secrets, handoff secrets, event secrets, and analytics salts never enter client bundles. Local Lab sessions do not bypass billing unless the explicit server-only bypass is enabled for a controlled operator workflow.
