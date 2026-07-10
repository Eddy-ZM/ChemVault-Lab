# ChemVault Lab

ChemVault Lab is an independent Web and future App system for organizing completed laboratory records. It accepts lab notebooks, experiment handouts, raw data tables, PDFs, images, Word files, spreadsheets, and selected instrument text exports, then produces structured JSON, Markdown, LaTeX `.tex`, and real `.xlsx` Excel workbooks for lab report preparation.

The project is built with Vite + React + TypeScript and Cloudflare Pages Functions. The structure keeps the UI, parsers, AI providers, OCR providers, Excel generation, authentication, storage, and API modules separate so the product can later be packaged as a PWA, iOS/iPadOS app, macOS app, or Windows app.

## Local Run

```bash
npm install
npm run dev
```

Run the Cloudflare Pages Functions version locally:

```bash
npm run build
npm run dev:pages
```

Run validation:

```bash
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

## Environment Variables

Use `.env.local` for Vite/local fallback and `.dev.vars` for Wrangler Pages Functions. Both are ignored by git.

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
AI_STAGE_TIMEOUT_MS=15000
OPENAI_API_KEY=
LOCAL_AI_ENDPOINT=
STORAGE_BUCKET=
DATABASE_URL=
JWT_SECRET=
LAB_ACCESS_CODE=
USER_SYSTEM_URL=https://user.chemvault.science
USER_SYSTEM_PROFILE_ENDPOINT=/api/auth/handoff/verify
USER_SYSTEM_EXCHANGE_ENDPOINT=
USER_SYSTEM_CLIENT_ID=
USER_SYSTEM_CLIENT_SECRET=
USER_SYSTEM_REQUIRED_SERVICE=chemvault-lab
OCR_PROVIDER=cloudflare
OCR_API_KEY=
OCR_ENDPOINT=
APP_BASE_URL=http://localhost:5173
NODE_ENV=development
```

`JWT_SECRET` enables Lab's own session token after a successful ChemVault User System handoff. `LAB_ACCESS_CODE` keeps the local fallback login available for development or private test workspaces. `OCR_PROVIDER=cloudflare` uses the Cloudflare Workers AI `AI.toMarkdown()` binding for scanned PDFs and images. `OCR_PROVIDER=cloud` remains available for a third-party OCR endpoint that accepts JSON with `file_name`, `mime_type`, and `content_base64`, then returns `text` plus optional `confidence`.

## Uploading Files

Open `/analyse`, drag in files, choose whether a handout is included or let the app auto-detect it, and optionally enter experiment name, course, date, operator, output language, and desired output formats.

Supported files:

- PDF
- DOCX
- XLSX
- CSV
- PNG
- JPG / JPEG
- WEBP
- TXT
- ASC
- JDX / DX

Readable PDFs, DOCX text, DOCX tables, XLSX sheets, CSV tables, JCAMP-DX spectra, and HPLC-style text exports are parsed directly. Images and scanned documents use the OCR adapter path; if OCR is not configured, the output is explicitly marked low confidence instead of being fabricated.

## Lab Workspace

ChemVault Lab includes selected app-workspace functions merged from the older ChemVault app surface, rebuilt under the Lab name, routes, icon, and data model.

- `/dashboard` gives a Lab workspace overview, recent analyses, review counts, and quick actions.
- `/documents` lists completed Lab analysis document sets.
- `/review` collects missing data and warnings that need human checking.
- `/documents` lists saved analyses and includes search across extracted experiment titles, reactions, chemicals, procedures, observations, raw data, and warnings.
- `/search` redirects to `/documents` for older links.
- `/exports` centralizes Excel, JSON, Markdown, and LaTeX downloads.
- `/usage` summarizes Lab analysis activity.
- `/settings` manages User System sign-in state and local Lab cache controls.

Public product pages from the older Extract surface now exist under the Lab brand: `/features`, `/demo`, `/use-cases`, `/security`, `/docs`, `/contact`, `/pricing`, `/account`, `/batch`, `/workspaces`, and `/developers`.

Billing checkout, developer API key management, workspace invites, member administration, and webhooks are intentionally disabled placeholders in the Lab MVP. Their API routes return clear `410` migration responses instead of silently failing.

## Extract Consolidation

ChemVault Lab is now the consolidation target for the former ChemVault Extract web app and API surface.

Primary domain:

```text
https://lab.chemvault.science
```

Unified API base:

```text
https://lab.chemvault.science/api
```

Current Cloudflare deployment:

- Pages project: `chemvault-lab`
- Stable Pages URL: `https://chemvault-lab.pages.dev`
- D1 database: `chemvault-lab`
- R2 bucket: `chemvault-lab`
- Custom domain requested: `lab.chemvault.science`
- Required DNS record when the custom domain is still pending: `CNAME lab chemvault-lab.pages.dev`

Compatibility endpoints are implemented in Lab for the old Extract-style core API surface:

- `GET /health`
- `POST /api/contact`
- `GET|POST /api/auth/logout`
- `GET|POST /api/auth/register`
- `GET /api/documents`
- `POST /api/documents/upload`
- `POST /api/documents/batch-upload`
- `POST /api/documents/batch-extract-ai`
- `GET /api/documents/:id`
- `GET /api/documents/:id/pages`
- `GET /api/documents/:id/blocks`
- `GET /api/documents/:id/tables`
- `GET /api/documents/:id/chunks`
- `GET /api/documents/:id/extractions`
- `GET /api/documents/:id/normalized-records`
- `GET /api/documents/:id/review-items`
- `POST /api/documents/:id/estimate-ai-cost`
- `POST /api/documents/:id/extract-ai`
- `POST /api/documents/:id/normalize`
- `POST /api/batch/extract-ai`
- `GET /api/batch/jobs`
- `GET /api/batch/jobs/:id`
- `POST /api/batch/jobs/:id/cancel`
- `POST /api/batch/jobs/:id/retry-failed`
- `GET /api/jobs/:id`
- `GET /api/search`
- `GET /api/database`
- `GET /api/exports`
- `POST /api/exports`
- `GET /api/review-items`
- `GET /api/review-items/:id`
- `GET /api/usage/current-month`
- `GET /api/projects`
- `GET /api/workspaces`
- `GET /api/workspaces/:id`
- `GET /api/workspaces/:id/members`
- `GET /api/workspaces/:id/invites`
- `POST /api/workspaces/:id/invites`
- `POST /api/workspaces/invites/:inviteId/accept`
- `GET /api/settings/ai`
- `GET /api/settings/ai/openai-key`
- `POST /api/settings/ai/openai-key`
- `POST /api/settings/ai/test-openai-key`
- `GET /api/settings/api-keys`
- `GET /api/settings/webhooks`
- `POST /api/records/:type/:id/renormalize`

Old Extract web paths such as `/documents/:id`, `/database`, `/batch`, `/developers`, `/account`, `/pricing`, `/docs`, `/login`, and `/register` route into Lab equivalents. Any old Extract API route that has no Lab implementation returns a structured `410` response with the Lab API base and available core routes.

Cutover steps after deploying Lab:

1. Add `lab.chemvault.science` as the custom domain for the `chemvault-lab` Cloudflare Pages project.
2. Set production environment variables on the Lab project.
3. Deploy the User System handoff changes so Lab sign-in works.
4. Smoke test `https://lab.chemvault.science`, `/dashboard`, `/analyse`, `/documents`, `/api/documents`, `/api/search`, and downloads.
5. Remove old Extract Cloudflare custom domains only after the Lab smoke test passes. The old Extract config used `app.chemvault.science` for the web worker and `api.chemvault.science` for the API gateway.
6. Retire the old Extract Pages/Workers once DNS and users have moved to Lab.

## User System Login And Private History

The app is wired for ChemVault User System sign-in:

- `GET /api/auth/user-system/start`
- `POST /api/auth/user-system/callback`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/history`

The primary sign-in button sends users to `USER_SYSTEM_URL/api/auth/handoff/start?returnTo=<Lab callback>`. If the user is not already signed in, User System redirects them to login and then resumes the handoff route. The handoff route appends a short-lived token to the Lab callback. Lab verifies it through `USER_SYSTEM_PROFILE_ENDPOINT` or exchanges a one-time code through `USER_SYSTEM_EXCHANGE_ENDPOINT`, then issues a ChemVault Lab JWT for private history and artifact downloads.

Local fallback login remains available through `LAB_ACCESS_CODE`. Signed-in analyses are associated with the Lab JWT subject and can be listed from `/history`. Anonymous analyses still work and fall back to temporary/local storage.

## API Routes

- `POST /api/upload`
- `POST /api/analyse`
- `GET /api/download/:id/:format`
- `GET /api/auth/user-system/start`
- `POST /api/auth/user-system/callback`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/history`

`/api/download/:id/:format` supports `xlsx`, `json`, `markdown`/`md`, and `latex`/`tex`.

The analysis pipeline stays staged:

1. Classify uploaded documents
2. Detect experiment title and experiment type
3. Detect reaction and scientific context
4. Extract chemicals, quantities, and conditions
5. Extract raw data
6. Identify calculations needed
7. Generate structured JSON
8. Generate Excel, Markdown, and LaTeX artifacts

DeepSeek is the default AI provider. OpenAI and local model provider ports are present for later switching.

## Excel Output

ChemVault Lab generates real `.xlsx` files with frozen header rows, styled headers, automatic column widths, numeric formatting, and separate unit columns.

Sheets:

1. Experiment Summary
2. Reaction Table
3. Procedure Timeline
4. Raw Data
5. Calculations
6. Observations
7. Issues and Missing Data

Filename format:

```text
chemvault_lab_<experiment_slug>_<date>.xlsx
```

## Cloudflare Persistence

D1 and R2 are optional but supported.

Create a D1 database and apply the migration:

```bash
wrangler d1 create chemvault-lab
wrangler d1 execute chemvault-lab --file migrations/0001_initial.sql
```

Create an R2 bucket:

```bash
wrangler r2 bucket create chemvault-lab
```

Then configure `wrangler.toml`:

```toml
[[d1_databases]]
binding = "LAB_DB"
database_name = "chemvault-lab"
database_id = "<cloudflare-d1-database-id>"

[[r2_buckets]]
binding = "LAB_BUCKET"
bucket_name = "chemvault-lab"

[ai]
binding = "AI"
```

When both bindings exist, signed-in analyses are written to D1 and private artifacts/source files are stored in R2 under owner-scoped keys.
The `AI` binding enables Cloudflare Workers AI Markdown Conversion for scanned PDFs and image OCR.

## Cloudflare Deployment

1. Create a Cloudflare Pages project.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables and secrets:
   - `AI_PROVIDER`
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_BASE_URL`
   - `DEEPSEEK_MODEL`
   - `AI_STAGE_TIMEOUT_MS` (optional, defaults to 15000 ms)
   - `JWT_SECRET`
   - `LAB_ACCESS_CODE`
   - `USER_SYSTEM_URL`
   - `USER_SYSTEM_PROFILE_ENDPOINT`
   - `USER_SYSTEM_EXCHANGE_ENDPOINT`
   - `USER_SYSTEM_CLIENT_ID`
   - `USER_SYSTEM_CLIENT_SECRET`
   - `USER_SYSTEM_REQUIRED_SERVICE`
   - `OCR_PROVIDER`
   - `OCR_API_KEY` if `OCR_PROVIDER=cloud`
   - `OCR_ENDPOINT` if `OCR_PROVIDER=cloud`
   - `APP_BASE_URL`
   - `NODE_ENV`
5. Add D1/R2 bindings if persistent private history is needed.

## Safety Rules

- Missing source data stays `null`, blank, `Missing`, or `unknown`.
- Low-confidence OCR and unclear handwriting are marked low confidence.
- Reaction identity is not invented when evidence is weak.
- Hazard information is organized only when present; the app does not provide hazardous operation optimization.
- Uploads and artifacts are not publicly exposed.
- Secrets are read from environment variables only.

## Current Limits

- User System SSO requires the User System deployment to include the `/api/auth/handoff/start` and `/api/auth/handoff/verify` routes.
- OCR is configured through Cloudflare Workers AI by default; third-party OCR endpoints can still be added with `OCR_PROVIDER=cloud`.
- JCAMP-DX and HPLC text exports are supported, but proprietary binary instrument files still need dedicated adapters.
- Chemical structure drawing and ELN-grade database workflows are not included yet.

## Roadmap

- Team workspaces and role-based Lab permissions from User System.
- Provider-specific OCR integrations.
- More vendor-native HPLC, NMR, IR, UV-Vis, and LC-MS parsers.
- Chemical structure and reaction drawing modules.
- Native app wrappers for iOS/iPadOS, macOS, and Windows.
