# LeadPilot AI — AI Lead Follow-Up Kit

Local-first lead management and human-reviewed email drafts. Backend milestones 1–2;
the frontend and commercial packaging are not included yet. LeadPilot never sends email.

## Run (Python 3.10+)

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd backend
../.venv/bin/python -m app
```

Server defaults to http://127.0.0.1:8000. OpenAPI documentation is at `/docs`.
Create the owner through `/api/auth/setup`; all mutations except the bearer-token
webhook require `X-Requested-With: LeadPilot`. See [API](docs/API.md).

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

Tests use temporary storage and mocked provider HTTP transports. No real email integration exists.
Demo seed: `demo/seed.json`. Loading demo settings replaces business settings; deleting demo
data removes only demo leads and their associated records, not the business settings.
