#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
(cd frontend && npm ci && npm run build)
python3 - "$ROOT" <<'PY'
import ast
import pathlib
import subprocess
import sys
import zipfile

root = pathlib.Path(sys.argv[1])
module = ast.parse((root / 'backend/app/__init__.py').read_text())
version = next(ast.literal_eval(n.value) for n in module.body
               if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == '__version__' for t in n.targets))
output = root / 'distribution/dist'
output.mkdir(parents=True, exist_ok=True)
target = output / f'LeadPilot-AI-v{version}.zip'
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
excluded = {'.git', '.env', '.spec.txt', '.venv', 'node_modules', 'data', '__pycache__',
            '.pytest_cache', '.ruff_cache', 'test-results', 'playwright-report', 'lp-shots'}
files = []
for name in tracked:
    path = pathlib.PurePosixPath(name)
    if not name or excluded.intersection(path.parts) or name.startswith('distribution/dist/'):
        continue
    if name.endswith(('.pyc', '.tsbuildinfo')):
        continue
    if (root / name).is_file():
        files.append(root / name)
files.extend(p for p in (root / 'frontend/dist').rglob('*') if p.is_file())
required = ['README-FIRST.txt', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docker-compose.yml',
            'scripts/start.sh', 'frontend/dist/index.html']
names = {p.relative_to(root).as_posix() for p in files}
for name in required:
    if name not in names:
        raise SystemExit(f'Missing {name}: stage new distribution files before building.')
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(set(files)):
        name = path.relative_to(root).as_posix()
        archive.write(path, name)
        print(name)
print(f'ZIP: {target}\nFiles: {len(set(files))}\nSize: {target.stat().st_size:,} bytes')
PY
