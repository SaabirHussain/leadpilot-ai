# Start here

Extract the complete customer ZIP into a folder you own. Choose **one** installation
method. Initial installation needs internet access. No Node.js is needed unless you
change/rebuild the interface yourself.

## Option A: Docker

Install and start Docker Desktop (or Docker Engine with Compose 2.24+ on Linux).
Open a terminal in the extracted folder:

```sh
docker compose up --build -d
```

Open **http://127.0.0.1:8000**. Stop with `docker compose down`. Data remains in a
Docker named volume. **Do not add `-v`** unless you intend to delete that volume.

## Option B: Python, without Docker

Install Python **3.10 or newer** from https://python.org/downloads/.
On Windows enable **Add Python to PATH**. On Ubuntu you may also need `python3-venv`.

- macOS/Linux: open a terminal in the extracted folder and run `./scripts/start.sh`.
- Windows: double-click `start.bat`. Windows launchers are **provided, not tested on Windows**.

The launcher installs Python dependencies, starts the app and opens your browser.
Keep its terminal open; **Ctrl+C** stops the server. Your local data is in `data/`.
If the browser does not open, visit **http://127.0.0.1:8000** yourself.

## First visit

Create the single owner account, then complete the five setup steps. Choose **Demo
mode** for drafts without any provider calls. Load fictional Northstar demo records
to explore, or start empty. Loading demo settings replaces your business profile.

Add a lead → generate a draft → review/edit → copy or open your email app → send it
yourself → approve and record **Mark as sent**. LeadPilot never sends email.

Back up before upgrades. See [Setup](SETUP_GUIDE.md), [Troubleshooting](TROUBLESHOOTING.md)
and [Privacy](PRIVACY_SECURITY.md). External AI usage is billed by its provider.
