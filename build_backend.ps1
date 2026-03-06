$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  Write-Host "Creating Python 3.12 virtual environment..." -ForegroundColor Yellow
  py -3.12 -m venv (Join-Path $root ".venv")
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
& $venvPython -m pip install -r (Join-Path $root "requirements.txt")

Write-Host "Compiling backend Python files..." -ForegroundColor Cyan
& $venvPython -m compileall -q (Join-Path $root "backend")

Write-Host "Backend build complete." -ForegroundColor Green
