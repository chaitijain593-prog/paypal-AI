#!/usr/bin/env bash
set -eo pipefail

echo "==> Running scripts/check_secrets.sh..."
if [ -f "scripts/check_secrets.sh" ]; then
    bash scripts/check_secrets.sh
fi

echo "==> [1/6] Python compileall..."
python -m compileall -q backend/app backend/tests

echo "==> [2/6] Pytest full suite..."
pytest -q backend

echo "==> [3/6] Frontend TypeScript check..."
(cd frontend && npx tsc --noEmit)

echo "==> [4/6] Frontend ESLint..."
(cd frontend && npm run lint)

echo "==> [5/6] Frontend production build..."
(cd frontend && npm run build)

if [ -f "scripts/smoke_test.py" ]; then
    echo "==> [6/6] Boot smoke test..."
    python scripts/smoke_test.py
fi

echo "==> ALL CHECKS PASSED!"
