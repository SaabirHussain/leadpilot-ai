import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

root = Path(__file__).resolve().parents[1]
os.environ.setdefault("DATA_DIR", str(root / "data"))
os.environ.setdefault("FRONTEND_DIST", str(root / "frontend" / "dist"))
os.environ.setdefault("HOST", "127.0.0.1")
os.environ.setdefault("PORT", "8000")
url = "http://127.0.0.1:" + os.environ["PORT"]


def open_when_ready():
    for _ in range(60):
        if process.poll() is not None:
            return
        try:
            with urllib.request.urlopen(url + "/api/health", timeout=1):
                if os.getenv("LEADPILOT_NO_BROWSER") != "1":
                    webbrowser.open(url)
                return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.5)


print(f"Opening LeadPilot at {url}. Keep this terminal open; Ctrl+C stops it.", flush=True)
process = subprocess.Popen([sys.executable, "-m", "app"], cwd=root / "backend")
threading.Thread(target=open_when_ready, daemon=True).start()
try:
    sys.exit(process.wait())
except KeyboardInterrupt:
    process.terminate()
    process.wait()
