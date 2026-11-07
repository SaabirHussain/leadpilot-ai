#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
for tool in python3 node npm ffmpeg ffprobe; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done
cd "$ROOT/frontend"
npm ci
npm run build
npx playwright install chromium
cd "$ROOT"
exec python3 marketing/video/render.py
