$ErrorActionPreference = "Stop"

Write-Host "==> Running check_secrets..."
if (Test-Path "scripts/check_secrets.sh") {
    & bash scripts/check_secrets.sh
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "==> [1/6] Python compileall..."
$py = "backend/venv/Scripts/python.exe"
if (-not (Test-Path $py)) { $py = "python" }

& $py -m compileall -q backend/app backend/tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [2/6] Pytest full suite..."
& $py -m pytest -q backend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [3/6] Frontend TypeScript check..."
Push-Location frontend
try {
    & npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "==> [4/6] Frontend ESLint..."
    & npm run lint
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "==> [5/6] Frontend production build..."
    & npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

if (Test-Path "scripts/smoke_test.py") {
    Write-Host "==> [6/6] Boot smoke test..."
    & $py scripts/smoke_test.py
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "==> ALL CHECKS PASSED!"
