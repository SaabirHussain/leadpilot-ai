# Troubleshooting

**Port already in use:** stop the other LeadPilot/server process. Native launch can
use `PORT=8005 ./scripts/start.sh` (PowerShell: `$env:PORT='8005'; .\scripts\start.ps1`).
Docker: change only the host side of the ports entry to `127.0.0.1:8005:8000`, then
`docker compose up -d`. Visit the new port. Do not run both installs on the same port.

**Docker not running:** start Docker Desktop or your Docker Engine service. Run
`docker info` and `docker compose version`. Compose 2.24+ supports optional env files.
Use `docker compose logs --tail=50` to inspect startup errors.

**Python missing/too old:** install Python 3.10+ from python.org; Windows needs PATH
enabled. Ubuntu may need `python3-venv`. If venv creation fails, install the venv
package matching your Python. Avoid moving a folder after creating its `.venv`;
delete only `.venv` (not `data`) and rerun the launcher to rebuild it.

**Forgot owner password:** this is a local administrator operation, not email recovery.
Back up first. Use the same DATA_DIR as your installed app. It retains leads/settings
and invalidates existing sessions. You will be prompted twice; never put passwords
on the command line.

Native, from the extracted root (stop the server first):
```sh
DATA_DIR="$PWD/data" PYTHONPATH="$PWD/backend" .venv/bin/python -m app reset-password
```
Windows PowerShell, from the extracted root:
```powershell
$env:DATA_DIR = "$PWD\data"
$env:PYTHONPATH = "$PWD\backend"
.\.venv\Scripts\python.exe -m app reset-password
```
Docker, while the container is running:
```sh
docker compose exec leadpilot python -m app reset-password
```
Then restart/login. Use your configured DATA_DIR instead of `data` if overridden.

**AI test fails:** save the correct provider, base URL, current model and key; check
connectivity, account permissions/billing and provider status. Ollama must be running
with that model downloaded. Read timeout is 120 seconds. Container `localhost` is not
the host. A successful test can still contain poor/malformed output; review it. The
1.5B model sometimes returns invalid JSON, which is shown as editable raw text.

**CSV errors:** use [CSV_TEMPLATE.csv](CSV_TEMPLATE.csv), save UTF-8 (BOM accepted),
keep the header, supply name and valid email or phone, and use a listed status.
Maximum 2 MB and 5,000 rows. Duplicate email rows are skipped. Dry-run first and read
per-row errors. Supported statuses: new, contacted, follow_up_needed, replied, won, lost.

**Deep link shows login:** log in and the original internal URL is restored. A missing
lead/draft may have been deleted. **Browser did not open:** visit the displayed URL.
**Blank UI:** extract all ZIP files, including frontend/dist; developer checkout needs a build.
