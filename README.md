# LeadPilot AI — AI Lead Follow-Up Kit

Local-first lead management and human-reviewed email drafts, with a responsive React
workspace. Milestones 1–3 are implemented; commercial packaging is not included yet.
LeadPilot never sends email.

## Run (Python 3.10+)

Build the frontend first (Node.js 22+):

```sh
cd frontend
npm ci
npm run build
cd ..
```

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend
../.venv/bin/python -m app
```

Server defaults to http://127.0.0.1:8000. OpenAPI documentation is at `/docs`.
Open the server URL in your browser to create your owner account and follow the setup
wizard. All mutations except the bearer-token webhook require
`X-Requested-With: LeadPilot`. See [API](docs/API.md).

For frontend development run `npm run dev` from `frontend/` alongside the backend;
Vite proxies `/api` to localhost:8000. Inter font files and icons are bundled, with no CDN.

Environment variables are read from the process environment (not automatically from `.env`).
See `.env.example`. Paths are relative to the server's working directory.
Back up the entire DATA_DIR with the server stopped. SQLite, secrets and lead data stay local
unless a configured AI provider is invoked or you export them. Protect this directory and
exports: data is not encrypted at rest. Use demo mode for zero-network drafts. External
providers can charge usage fees and receive lead context. No paid calls were used in testing.
Local Ollama can use the OpenAI-compatible adapter without a key.

For Anthropic set provider `anthropic`, base URL `https://api.anthropic.com/v1`, a valid
model and your own key. For OpenAI-compatible services set the matching `/v1` base URL.
Never expose this service publicly without HTTPS, secure cookies and a reverse proxy.
The initial release targets one local owner, one server process.

## Checks

```sh
cd backend
../.venv/bin/pytest -q
../.venv/bin/ruff check .
```

From `frontend/`: `npm run build`, `npm run lint`, and `npm run test:e2e`.
Install Chromium once with `npx playwright install chromium`. The smoke test starts the
built app with a fresh DATA_DIR under `~/lp-e2e/` and captures pages in `~/lp-shots/`
(override screenshots with `SCREENSHOT_DIR`). Port 8000 must be available. The test
uses fictional demo records and does not send email or invoke a paid provider.

Tests use temporary storage and mocked provider HTTP transports. No real email integration exists.
Demo seed: `demo/seed.json`. Loading demo settings replaces business settings; deleting demo
data removes only demo leads and their associated records, not the business settings.
