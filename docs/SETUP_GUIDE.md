# Setup guide

## Docker installation

Use Docker Desktop, or Docker Engine with Compose **2.24+**. Ensure Docker is running.
Extract the ZIP, open a terminal in that folder and run `docker compose up --build -d`.
Visit http://127.0.0.1:8000. Check status with `docker compose ps` and logs with
`docker compose logs --tail=50`. `docker compose down` stops the container without
deleting its named volume. `docker compose down -v` permanently removes that volume.

The `.env` file is optional with Compose 2.24+. Copy `.env.example` to `.env` only if
you need overrides. Compose explicitly fixes the container's HOST, PORT, DATA_DIR and
FRONTEND_DIST. The published port is localhost-only. For older Compose versions,
upgrade or remove `required: false` and first copy `.env.example` to `.env`.

The container runs as UID 10001. Its default named volume is initialized with the
right ownership. A custom host bind mount must be writable by UID 10001. Do not use
world-writable permissions. Docker builds need internet and build the interface with
Node inside the build stage; no host Node installation is needed.

## Installation without Docker

Install Python 3.10+ (including venv/pip), extract the entire ZIP and run
`./scripts/start.sh` on macOS/Linux or `start.bat` on Windows. The ZIP includes the
built interface. First launch downloads dependencies into `.venv/`. Keep the terminal
open. Rerun the same launcher later; pip checks already-installed requirements.
Python installation and dependency downloads require internet. Use `PYTHON` to choose
a Python executable on macOS/Linux. On Windows the launcher tries `py -3`, then `python`.
Windows scripts are **provided, not tested on Windows**; PowerShell syntax was checked
on Linux, not Windows process behavior. macOS execution has not been tested.

Environment overrides must be set in your shell before launching; these scripts do
not automatically read `.env`. Defaults use `data/` in the extracted folder, the
prebuilt interface, and `127.0.0.1:8000`. For example on macOS/Linux:
`PORT=8005 ./scripts/start.sh`. Do not run two processes on the same workspace database.

## First-run onboarding

1. Create an owner email/password. There is one owner, not a team permission system.
2. Enter your business profile and services.
3. Pick communication tone and signature; configure follow-up intervals/timezone/hour.
4. Pick Demo mode or an AI provider. Keys are write-only in the UI.
5. Load fictional demo records or start empty. Demo loading replaces business settings.

Use Settings later to change these choices. Approve does not send a message; after
sending yourself, Mark as sent records contact and schedules the next reminder.

## Enabling AI

Provider usage is **billed by the provider** under its own terms. Check its current
pricing and data policy before sending customer data. Obtain your own key; do not
share it with customers or place it in website form code. Choose a model currently
available to your account; examples/presets are not a promise of model availability.

| Provider selection | Base URL | Pricing |
|---|---|---|
| OpenAI-compatible: OpenAI | `https://api.openai.com/v1` | https://openai.com/api/pricing/ |
| Anthropic | `https://api.anthropic.com/v1` | https://www.anthropic.com/pricing |
| OpenAI-compatible: OpenRouter | `https://openrouter.ai/api/v1` | https://openrouter.ai/models |
| OpenAI-compatible: Groq | `https://api.groq.com/openai/v1` | https://groq.com/pricing |
| OpenAI-compatible: local Ollama | `http://localhost:11434/v1` | Free local software/inference; your hardware/electricity costs apply |

Save provider, URL, model and key in Settings → AI provider, then Test connection.
Review the returned sample. A successful request is not proof of output quality.
For free local generation see [Ollama](LOCAL_AI.md). It needs a decent machine and is
slower on CPU; the tested small models produced errors and require careful review.

Inside Docker, `localhost` is the container, not your host Ollama. Docker Desktop
can use `http://host.docker.internal:11434/v1` only if Ollama is reachable from the
container. Linux needs a suitable host-gateway/network configuration. Do not simply
expose Ollama's unauthenticated API to a public interface. Native installation is
the simplest way to use host-local Ollama. Ollama is not installed by Compose.
