# Backend architecture (milestones 1–2)

Python 3.10, FastAPI and SQLAlchemy 2 run as a single local process. SQLite uses
foreign-key cascades for lead deletion. `create_all` plus a schema-version row initializes
the database; future incompatible schema changes will need an explicit migration.
`app.main.create_app(data_dir, background)` supports isolated tests and restarts.

- `models.py`: owner, business singleton, leads, follow-ups, drafts, revisions, activity.
- `schemas.py`: bounded inputs, contact validation, status/tone/provider enums, IANA timezone.
- `followups.py`: pure timezone-aware due calculation plus database scheduling/cancellation
  and idempotent overdue sweep. Each contact schedules the next interval relative to that
  contact. DST folds use the first occurrence; gaps round-trip forward. Dates are stored
  as naive UTC and exposed with a `Z` suffix.
- `ai/`: deterministic demo templates and synchronous HTTP adapters for OpenAI-compatible
  and Anthropic Messages APIs. Provider calls time out at 30 seconds. Business context is
  trusted system data; lead fields appear only in an HTML-escaped, untrusted user block.
  Heuristic output warnings supplement mandatory human review, not a security guarantee.
- `main.py`: session authentication, CSV ingestion, API, privacy tools, fictional demo data,
  optional static frontend files and SPA fallback. Unknown API routes never return the SPA.

The background asyncio task sweeps every 60 seconds (configurable/disableable). It does not
send email or call AI. Reminders/dashboard also sweep on access. Calendar-day reminder
buckets use the business timezone; upcoming reminders are capped at seven days. A new
lead needs an initial response immediately. Replied/won/lost/opt-out cancel pending work;
draft generation and approval are blocked for these leads. Editing an approved draft
returns it to review. Mark-sent is a record of a human action, never an email transport.

Single-owner bcrypt authentication uses signed, seven-day HTTP-only Strict SameSite cookies.
Custom mutation headers enforce same-origin browser requests; CORS is not enabled. Login
failures are limited per IP in memory (single-process/local-use limitation). HTTPS deployments
must enable COOKIE_SECURE. Secrets are mode 0600 files or environment overrides, never part
of settings/export responses. Lead content is not logged by application handlers. Uvicorn
access logs may include URLs; the module entrypoint disables these. When running uvicorn
directly use `--no-access-log` to keep query-string PII out of logs.
SQLite and exports are not encrypted. Protect backups and directory permissions.

Inbound webhooks bypass cookie/CSRF auth and require a revocable bearer token whose hash
alone is stored in SQLite. API errors share an `error` envelope, without echoed input values
or upstream error bodies. JSON export includes leads, drafts, revisions, follow-ups and
activity; CSV exports leads and prefixes spreadsheet formula triggers. Full reset removes
owner/settings and file-stored AI key; environment overrides remain configured externally.

Demo seed timelines are relative to load time, with due dates set at the business-local send
hour. The fictional dataset includes initial replies, overdue/today/upcoming follow-ups and
closed leads with dated activity. Simulated inquiries rotate through seed scenarios, using
persisted simulation activities to retain the rotation across restarts. Demo drafts use fixed
topic snippets and matching configured services, three tones and step-specific follow-ups;
they do not interpret arbitrary instructions in lead text or claim to have inspected a site.

The frontend uses React 18, TypeScript, Vite, Tailwind CSS 3 and React Router. It bundles
Inter fonts and inline/lucide SVGs for offline use. Same-origin fetch includes credentials
and the mutation CSRF header. Setup, dashboard, leads, draft editor, reminders, activity
and settings use the backend API; no application secrets are placed in browser storage.
Theme preference is persisted locally, initially following the system. Modal focus trapping,
Escape handling, labelled controls and reduced-motion styling support keyboard access.
Desktop tables become mobile lead cards. The Playwright smoke test starts a fresh backend
serving the built dist and covers setup through recording a personally sent draft.

No deployment image, n8n workflow, Gmail transport, marketing assets or commercial license
is delivered yet. This is not an autonomous outreach system.
