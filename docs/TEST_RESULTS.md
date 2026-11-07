# Release 1.0.0 test results

## Environment and automated checks

Ubuntu Linux VM, native Python 3.10.12; Docker Engine 29.9.2, Compose v5.6.1.
Docker builds frontend with node:20-alpine and runs python:3.12-slim.

```text
pytest -q backend/tests
39 passed, 1 skipped, 1 warning in 10.52s

ruff check backend scripts/launch.py
All checks passed!

npm run build
✓ 1599 modules transformed.
✓ built in 1.86s

npm run lint
> eslint .
(exit 0, no errors)

npm run test:e2e
1 passed (22.5s)

E2E_BASE_URL=http://127.0.0.1:8000 npm run test:e2e
(native ZIP instance) 1 passed (20.5s)
(Docker ZIP instance) 1 passed (20.4s)
```

Smoke coverage includes fresh setup/onboarding/demo, overdue dashboard, draft edits,
clipboard, mark-sent/reminders, light/dark and mobile. Regression coverage directly
loads/reloads a draft URL and clears cookies: login preserves next and returns to
that draft. A separate browser check rejected an external next URL and verified
Account displays Version 1.0.0. Screenshot visually inspected:
`/home/ubuntu/lp-shots/packaging-account-version.png` (verification VM only).

The skipped test is opt-in live AI. The warning is upstream Starlette/AnyIO's
deprecated BlockingPortal alias. npm installation still reports **7 moderate
dependency vulnerabilities** and an upstream ESLint support/deprecation warning;
no forced dependency upgrades were made. These are release-review items, not a
claim of a vulnerability-free product.

## Docker install, health, persistence

Repository and extracted customer ZIP both built/started successfully. The extracted
kit was tested independently at `/home/ubuntu/lp-fresh-i5DpC8`, without a .env file:

```text
docker compose up --build -d --wait
Container lp-fresh-i5dpc8-leadpilot-1 Healthy

Published port: 127.0.0.1:8000->8000/tcp
GET /api/health: {"ok":true,"version":"1.0.0"}
uid=10001(leadpilot) gid=10001(leadpilot) groups=10001(leadpilot)
```

After Docker-backed smoke, compared all lead rows across
`docker compose down && docker compose up -d --wait`:

```text
Before: 9 cdf26333d25aaeaeebe4c57af50431fa51bac08b701255b97daef9635ab10689
After:  9 cdf26333d25aaeaeebe4c57af50431fa51bac08b701255b97daef9635ab10689
Persistence verified: identical lead count and full-row SHA256 after down/up.
{"ok":true,"version":"1.0.0"}
```

No volume removal was used. This checks restart persistence, not crash recovery.

## Fresh ZIP/native installation

Built with distribution/build_zip.sh; extracted to a new folder, no repo-specific
launcher paths, Node or shared virtual environment required. Ran ./scripts/start.sh
at its default localhost:8000, with LEADPILOT_NO_BROWSER=1 for the headless VM.
It created .venv, installed runtime requirements and served the included frontend.
The full external-instance smoke above completed onboarding and all UI checks.

After the Unix-permission portability guard was added, a second clean extraction
at `/home/ubuntu/lp-final-native-j6Cxnw` ran the same launcher (PORT=8001 to avoid
the Docker instance). API first-run/onboarding output:

```text
{"ok":true,"version":"1.0.0"}
Fresh ZIP initial auth: {'setup_required': True, 'authenticated': False}
Fresh ZIP onboarding: Fresh ZIP Verification complete=True
Fresh ZIP authenticated: {'setup_required': False, 'authenticated': True}
```

Final packaging adds this completed report; application files/assets are identical
to the verified extraction. The ZIP's executable permission on start.sh is retained.
No .git, .venv, node_modules, live data, .env, .spec.txt, screenshots, E2E output or
cache entries were found. .env.example is intentionally included and contains no
secret values. No plausible API keys or actual local signing secret were found.
Literal sk- matches are this report and the queue-microtask package URL in the npm
lockfile, not keys. secret_key occurs only in source/tests/docs references, not an
included secret file.

## License inventory

THIRD_PARTY_NOTICES.md was generated from an actual clean backend runtime install
using pip-licenses, and actual npm production dependencies using license-checker.
Includes Inter SIL OFL-1.1 and tzdata Apache-2.0. No GPL/AGPL application packages
were identified; certifi uses MPL-2.0 (file-level copyleft). Docker's Debian OS has
separate packages: /usr/share/doc/coreutils/copyright explicitly reports GPL-3+.
The OS image was not comprehensively license-audited. Commercial LICENSE is a
draft, not legal advice; obtain legal review before selling.

## Local AI and untested scope

See [LIVE_AI_VERIFICATION.md](LIVE_AI_VERIFICATION.md) for every measured local
draft/output and timings (about 5–47 seconds on this VM). qwen2.5:1.5b had malformed
JSON and followed a discount injection (warning fired). qwen2.5:3b parsed better but
still invented details. Do not use unreviewed output. Ollama remains local/running;
it is deliberately not included in Compose. No paid API or real email was used.

Windows scripts are **provided, not tested on Windows**. PowerShell parser check
on Linux passed: `start.ps1: PowerShell parser OK (Linux; Windows execution untested)`.
tzdata is included for systems without IANA zones; Unix-only fchmod is guarded and
its absence has a unit test. Neither substitutes for actual Windows testing.
macOS execution, automatic browser opening (suppressed for headless verification),
Safari, paid providers, public/LAN/HTTPS deployments and backup restore were not
tested in this milestone. Earlier live local-AI results were not rerun.

## ZIP file list

The builder prints the final byte size to stdout; see distribution/dist/
LeadPilot-AI-v1.0.0.zip. This ZIP is intentionally Git-ignored. Its 74 entries:

```text
.dockerignore
.env.example
.gitignore
Dockerfile
LICENSE
README-FIRST.txt
README.md
THIRD_PARTY_NOTICES.md
backend/app/__init__.py
backend/app/__main__.py
backend/app/ai/__init__.py
backend/app/ai/demo.py
backend/app/followups.py
backend/app/main.py
backend/app/models.py
backend/app/schemas.py
backend/pyproject.toml
backend/requirements-dev.txt
backend/requirements.txt
backend/tests/conftest.py
backend/tests/test_api.py
backend/tests/test_engine_ai.py
backend/tests/test_live_provider.py
backend/tests/test_packaging.py
demo/seed.json
distribution/build_zip.sh
docker-compose.yml
docs/API.md
docs/ARCHITECTURE.md
docs/CSV_TEMPLATE.csv
docs/FEATURES.md
docs/LIVE_AI_VERIFICATION.md
docs/LOCAL_AI.md
docs/PRIVACY_SECURITY.md
docs/QUICK_START.md
docs/SETUP_GUIDE.md
docs/TEST_RESULTS.md
docs/TROUBLESHOOTING.md
frontend/dist/assets/index-BjrsB0RZ.css
frontend/dist/assets/index-CtFGVID_.js
frontend/dist/assets/inter-latin-400-normal-BOOGhInR.woff2
frontend/dist/assets/inter-latin-400-normal-gitzw0hO.woff
frontend/dist/assets/inter-latin-500-normal-D2bGa7uu.woff2
frontend/dist/assets/inter-latin-500-normal-deR1Tlfd.woff
frontend/dist/assets/inter-latin-600-normal-B5cFAncS.woff
frontend/dist/assets/inter-latin-600-normal-D273HNI0.woff2
frontend/dist/assets/inter-latin-700-normal-B8MtJ_2k.woff
frontend/dist/assets/inter-latin-700-normal-Sckx8rpT.woff2
frontend/dist/favicon.svg
frontend/dist/index.html
frontend/e2e/smoke.spec.ts
frontend/eslint.config.js
frontend/index.html
frontend/package-lock.json
frontend/package.json
frontend/playwright.config.ts
frontend/postcss.config.js
frontend/public/favicon.svg
frontend/src/App.tsx
frontend/src/api.ts
frontend/src/auth.tsx
frontend/src/leads.tsx
frontend/src/main.tsx
frontend/src/settings.tsx
frontend/src/style.css
frontend/src/ui.tsx
frontend/src/workspace.tsx
frontend/tailwind.config.js
frontend/tsconfig.json
frontend/vite.config.ts
scripts/launch.py
scripts/start.ps1
scripts/start.sh
start.bat
```
