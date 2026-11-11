#!/usr/bin/env bash
set -eo pipefail

echo "==> Checking for tracked sensitive files..."
FORBIDDEN_FILES=(
    ".env"
    "backend/.env"
    "frontend/.env"
    "backend/app/keys"
    "keys/merchant_ed25519.pem"
    "backend/keys/merchant_ed25519.pem"
)

for file in "${FORBIDDEN_FILES[@]}"; do
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        echo "ERROR: Sensitive file '$file' is tracked in git repository!"
        exit 1
    fi
done

# Check if any *.pem or *.db files are tracked
TRACKED_PEM=$(git ls-files "*.pem")
if [ -n "$TRACKED_PEM" ]; then
    echo "ERROR: Found tracked *.pem files in git:"
    echo "$TRACKED_PEM"
    exit 1
fi

TRACKED_DB=$(git ls-files "*.db" "*.sqlite" "*.sqlite3")
if [ -n "$TRACKED_DB" ]; then
    echo "ERROR: Found tracked database files in git:"
    echo "$TRACKED_DB"
    exit 1
fi

echo "==> Scanning tracked files for secret patterns..."
P1='AIza[0-9A-Za-z_-]{35}'
P2='sk-[a-zA-Z0-9]{48}'
P3='access_token\$sandbox\$[0-9a-zA-Z]+'
P4='BEGIN (OPENSSH|RSA|EC|DSA|ED25519) PRIVATE KEY'

for pattern in "$P1" "$P2" "$P3" "$P4"; do
    MATCHES=$(git grep -E -e "$pattern" -- ':(exclude)*.example' ':(exclude)*.log' ':(exclude)scripts/check_secrets.sh' || true)
    if [ -n "$MATCHES" ]; then
        echo "ERROR: Detected potential live credential matching pattern '$pattern':"
        echo "$MATCHES"
        exit 1
    fi
done

echo "==> Scanning deployment config for hardcoded token patterns..."
DEPLOY_MATCHES=$(git grep -E -e "tok_[a-z]+_[0-9]+" -- "render.yaml" "Dockerfile*" "docker-compose*" || true)
if [ -n "$DEPLOY_MATCHES" ]; then
    echo "ERROR: Hardcoded weak token found in deployment config:"
    echo "$DEPLOY_MATCHES"
    exit 1
fi

echo "==> Secrets check passed cleanly: 0 tracked secrets found."
