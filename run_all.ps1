$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "v0-justice-ai-frontend"
$venvPython = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  Write-Host "Virtual environment not found. Run .\build_backend.ps1 first." -ForegroundColor Red
  exit 1
}

Write-Host "Ensuring backend dependencies are installed..." -ForegroundColor Cyan
& $venvPython -m pip install -r (Join-Path $root "requirements.txt") | Out-Null

Write-Host "Ensuring frontend dependencies are installed..." -ForegroundColor Cyan
Push-Location $frontendDir
npm install | Out-Null
Pop-Location

$backendPid = (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($backendPid) {
  Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
}

$frontendPid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($frontendPid) {
  Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
$backend = Start-Process -FilePath $venvPython -ArgumentList "-m","uvicorn","main:app","--host","127.0.0.1","--port","8000" -WorkingDirectory $backendDir -PassThru

Write-Host "Starting frontend on http://127.0.0.1:3000 ..." -ForegroundColor Cyan
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev","--","--port","3000" -WorkingDirectory $frontendDir -PassThru

Start-Sleep -Seconds 8

try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 10
  Write-Host "Backend OK: $($health.StatusCode) $($health.Content)" -ForegroundColor Green
} catch {
  Write-Host "Backend check failed: $($_.Exception.Message)" -ForegroundColor Red
}

try {
  $front = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 10
  Write-Host "Frontend OK: $($front.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host "Frontend check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Backend launcher PID: $($backend.Id)" -ForegroundColor Yellow
Write-Host "Frontend launcher PID: $($frontend.Id)" -ForegroundColor Yellow
