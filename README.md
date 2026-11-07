# LeadPilot AI — AI Lead Follow-Up Kit

A local single-owner workspace for leads, human-reviewed email drafts and follow-up
reminders. **It never sends email automatically.** Gmail transport and bulk sending
are not included. Real provider adapters, fictional demo mode, CSV import/export,
privacy controls and responsive light/dark UI are implemented.

## Buyers

Extract the customer ZIP, then read [README-FIRST.txt](README-FIRST.txt) and
[Quick Start](docs/QUICK_START.md). The ZIP includes the prebuilt interface, so native
installation needs Python 3.10+, not Node. Docker is an alternative. Initial
dependency/image installation needs internet. Protect local data and backups.

- [Setup guide](docs/SETUP_GUIDE.md) / [Features and exclusions](docs/FEATURES.md)
- [Troubleshooting and password reset](docs/TROUBLESHOOTING.md)
- [Privacy and security](docs/PRIVACY_SECURITY.md)
- [Local Ollama](docs/LOCAL_AI.md) / [Actual model results](docs/LIVE_AI_VERIFICATION.md)
- [Test results and untested platforms](docs/TEST_RESULTS.md)

External AI usage is billed by its provider. Demo drafts make no provider calls;
small local models can be slow and unreliable. Review every draft. LICENSE is a
**commercial single-business draft requiring legal review before sale**. Upstream
licenses are in THIRD_PARTY_NOTICES.md.

## Developers

Python 3.10+, Node 20+, npm and Git. From the repository root:

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
cd frontend
npm ci
npm run build
cd ..
./scripts/start.sh
```

For separate frontend development run `npm run dev` from frontend/ alongside the
backend (`cd backend && ../.venv/bin/python -m app`). Vite proxies /api to :8000.
FastAPI serves the built SPA/API on one port. Fonts/icons are bundled, with no CDN.
[API contract](docs/API.md), interactive /docs, [architecture](docs/ARCHITECTURE.md).

Native environment variables come from the process, not an auto-loaded .env.
Launchers set absolute DATA_DIR and FRONTEND_DIST paths inside the extracted folder.
Compose optionally reads .env (2.24+) and fixes container paths. Native bind and
Docker published port default to localhost. Do not expose publicly without a
reviewed HTTPS reverse proxy and access controls.

## Checks and distribution

```sh
.venv/bin/pytest -q backend/tests
.venv/bin/ruff check backend scripts/launch.py
cd frontend
npm run build
npm run lint
npx playwright install chromium
npm run test:e2e
```

The smoke test starts a fresh backend unless E2E_BASE_URL is set. For a **fresh**
Docker install: `E2E_BASE_URL=http://127.0.0.1:8000 npm run test:e2e`. It creates
an account/demo records: never point it at buyer data. Screenshots default to
~/lp-shots (SCREENSHOT_DIR overrides). Live-provider tests are skipped unless
explicitly enabled; see LOCAL_AI.md.

Stage intended source files, then run `./distribution/build_zip.sh`. It builds
the interface, packages only Git-tracked source files plus frontend/dist, excludes
local data/secrets/caches and prints its file list/size. The ZIP is ignored under
distribution/dist/. No Docker image, Python runtime or node_modules is bundled.
