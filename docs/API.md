# Frontend API contract

Public `GET /api/health` returns `{ "ok": true, "version": "1.0.0" }`, sourced from
`app.__version__`. This checks process readiness, not AI or database integrity.
Password recovery is a local CLI operation (`python -m app reset-password`), not an
unauthenticated endpoint.

Base `/api`. All dates are ISO-8601 UTC ending `Z`. All routes except auth status/setup/login,
health and inbound lead require the session cookie. Use `credentials: 'same-origin'` and send
`X-Requested-With: LeadPilot` on POST/PATCH/DELETE (also setup/login). Do not send that
header for third-party inbound forms; use server-to-server bearer authentication.

Errors: `{"error":{"code":422,"message":"Validation failed","details":[{"location":["body","name"],"message":"..."}]}}`.
Other errors omit details. 401 authentication, 403 CSRF, 404 missing, 409 state conflict,
413 CSV limits, 422 validation, 429 login limit, 502 provider failure.

## Shapes

Lead input: `{name,company?,email?,phone?,service_requested?,inquiry_message?,notes?,status?}`.
Name and either valid email or phone required. Lead output adds
`id,opted_out,source,is_demo,created_at,last_contacted_at,next_follow_up_at`.
Status: `new|contacted|follow_up_needed|replied|won|lost`. Source: `manual|csv|webhook|demo`.
PATCH lead is partial; other input objects reject unknown fields.

Draft: `{id,lead_id,followup_id,kind,tone,subject,body,status,generated_by,warnings,created_at,updated_at}`.
Kind `initial|follow_up`; tone `professional|friendly|concise`; status `draft|approved|sent|discarded`.
`generated_by: "demo"` MUST be labelled “Demo draft” in the UI; other values are `provider:model`.
Every message requires human review. Approve does not schedule contact; mark-sent does.
Revision stores the pre-edit subject/body and timestamp on every edit.

FollowUp: `{id,lead_id,step,due_at,status,cancel_reason}` with `pending|done|cancelled`.
Activity: `{id,lead_id,type,message,created_at}`. Activity text contains no secret values.

Settings GET: `{id,business_name,industry,services:[],description,tone,signature,
followup_intervals_days:[2,5,10],timezone:"America/Toronto",send_hour_local:9,
ai_provider:"demo",ai_base_url,ai_model,onboarding_complete,demo_mode,ai_api_key_configured:false}`.
PATCH accepts a partial settings object excluding id/configured flag, plus write-only `ai_api_key`.
Empty key clears the file key; environment key always wins. Token hashes never appear.

## Routes

| Method | Path | Purpose / request → response |
|---|---|---|
| GET | /api/auth/status | `{setup_required,authenticated}` |
| POST | /api/auth/setup | `{email,password}` → `{authenticated:true}`; sets cookie, first-run only |
| POST | /api/auth/login | `{email,password}` → `{authenticated:true}`; sets cookie |
| POST | /api/auth/logout | Clears cookie → `{authenticated:false}` |
| GET | /api/settings | Safe settings shape above |
| PATCH | /api/settings | Partial settings → safe settings |
| POST | /api/settings/ai/test | No body; tiny generation → `{ok:true,sample:{subject,body}}` |
| POST | /api/settings/inbound-token | Rotates token → `{token}` shown once |
| POST | /api/inbound/lead | Bearer token + Lead input → Lead (201) |
| GET | /api/leads | `search,status,follow_up_due,sort,order,page,page_size` → `{items:Lead[],total,page,page_size}` |
| POST | /api/leads | Lead input → Lead (201) |
| GET | /api/leads/import/template | CSV template download |
| POST | /api/leads/import | multipart `file`; query `dry_run=true` → `{created,skipped,errors,row_errors:[{row,messages:[]}],preview:[],dry_run}` |
| GET | /api/leads/{id} | Lead plus `activity:[],drafts:[],followups:[]` |
| PATCH | /api/leads/{id} | Partial Lead input → Lead |
| DELETE | /api/leads/{id} | Cascading hard delete → `{deleted:true}` |
| POST | /api/leads/{id}/status | `{status}` → Lead; `contacted` records manual contact |
| POST | /api/leads/{id}/opt-out | No body; cancels pending → Lead |
| POST | /api/leads/{id}/drafts/generate | `{kind?,tone?,regenerate?:false}` → `{draft:Draft,duplicate:boolean}` |
| PATCH | /api/drafts/{id} | `{subject?,body?}` → Draft, resets approval |
| GET | /api/drafts/{id}/revisions | `[{id,draft_id,subject,body,created_at}]` |
| POST | /api/drafts/{id}/approve | No body → approved Draft |
| POST | /api/drafts/{id}/mark-sent | No body → sent Draft, records human contact + next step |
| POST | /api/drafts/{id}/discard | No body → discarded Draft |
| GET | /api/reminders | `{overdue:Lead[],today:Lead[],upcoming:Lead[]}` (next seven days) |
| GET | /api/dashboard | `{counts_by_status:{new:0,...},outstanding_followups,overdue_count,recent_activity:[],leads_needing_attention:Lead[]}` |
| GET | /api/activity | Most recent 100 Activity rows, with `lead_name` (string or null); dashboard `recent_activity` includes it too |
| GET | /api/export | `format=json|csv`; JSON `{leads:[],drafts:[],activity:[],followups:[],revisions:[]}` or CSV lead download |
| DELETE | /api/data | JSON `{confirm:"DELETE ALL DATA"}`; optional `include_settings=true` also removes account/settings/file key → `{deleted:true,setup_required:boolean}` |
| POST | /api/demo/load | No body; fictional settings/leads → `{loaded:boolean,message?:string}`; idempotent |
| POST | /api/demo/simulate-inquiry | No body → fictional Lead (201) |
| DELETE | /api/demo | Removes only demo leads + associated rows → `{deleted:true}` |

List sort: `created_at|name|next_follow_up_at|status`; order `asc|desc` (default desc).
Pagination defaults 1/25, max 200. Due filters `overdue|today|upcoming|none` are business-local
calendar buckets (list upcoming has no seven-day cap). Outstanding includes initial responses.
CSV is UTF-8 with optional BOM, max 2 MiB/5000 rows, exact template headers. Duplicate email
rows (case-insensitive, including within the upload) are skipped. Dry-run does not persist.
Row errors use CSV line numbering starting at 2. `created` means “would create” in dry-run.
Generation auto-selects the current pending step; exhausted schedules return 409.

Interactive schema: `/docs`; machine-readable schema: `/openapi.json`.
