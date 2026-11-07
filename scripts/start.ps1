$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
try {
    if (Get-Command py -ErrorAction SilentlyContinue) { $Python = 'py'; $PythonArgs = @('-3') }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { $Python = 'python'; $PythonArgs = @() }
    else { throw 'Install Python 3.10+ from python.org and enable Add Python to PATH.' }
    & $Python @PythonArgs -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else "Python 3.10+ required")'
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.10+ is required.' }
    if (-not (Test-Path 'frontend/dist/index.html')) { throw 'Extract the complete customer ZIP: prebuilt frontend is missing.' }
    if (-not (Test-Path '.venv/Scripts/python.exe')) {
        & $Python @PythonArgs -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Could not create Python virtual environment.' }
    }
    & '.\.venv\Scripts\python.exe' -m pip install -r backend/requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check internet access.' }
    & '.\.venv\Scripts\python.exe' scripts/launch.py
    exit $LASTEXITCODE
} catch { Write-Error $_; exit 1 }
