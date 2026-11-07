#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
PYTHON=${PYTHON:-python3}
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "Python 3.10+ is required. Install it from python.org, then try again." >&2
  exit 1
fi
"$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else "Python 3.10+ is required")'
if [ ! -f frontend/dist/index.html ]; then
  echo "Prebuilt frontend missing. Extract the complete customer ZIP, or build frontend/ with Node." >&2
  exit 1
fi
if [ ! -x .venv/bin/python ]; then "$PYTHON" -m venv .venv; fi
.venv/bin/python -m pip install -r backend/requirements.txt
exec .venv/bin/python scripts/launch.py
