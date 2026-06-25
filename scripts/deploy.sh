#!/usr/bin/env bash
#
# ZIDI Connect — production deploy script.
# Pulls latest code, rebuilds images, runs migrations + collectstatic,
# and rolls services one-at-a-time for near-zero downtime.
#
# Usage: ./scripts/deploy.sh

set -euo pipefail
IFS=$'\n\t'

START_TS=$(date +%s)
COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE="docker compose -f ${COMPOSE_FILE}"

trap 'echo "DEPLOY FAILED at line ${LINENO}" >&2' ERR

# Resolve project root from this script's location so the deploy works from any cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo "=============================================================="
echo " ZIDI Connect deploy"
echo " Date    : $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo " Commit  : ${COMMIT}"
echo " Root    : ${PROJECT_ROOT}"
echo "=============================================================="

if [ ! -f ".env" ]; then
    echo "ERROR: .env not found at project root. Copy .env.example and fill it in." >&2
    exit 1
fi

# Refuse to silently stash local edits — operator should know.
if [ -n "$(git status --porcelain 2>/dev/null || true)" ]; then
    echo "WARNING: working tree is dirty. Continuing without stashing." >&2
fi

echo "--> git pull --ff-only"
git pull --ff-only

echo "--> docker compose pull (best-effort)"
${COMPOSE} pull || echo "  (some images are built locally; pull errors are non-fatal)"

echo "--> Building backend and frontend images"
${COMPOSE} build --pull backend frontend

echo "--> Running database migrations"
${COMPOSE} run --rm backend python manage.py migrate --noinput

echo "--> Collecting static files"
${COMPOSE} run --rm backend python manage.py collectstatic --noinput

# Roll services one at a time with --no-deps so we never stop the whole stack.
# Order: backend first (so new API is ready before frontend), then workers, then frontend.
echo "--> Rolling backend"
${COMPOSE} up -d --no-deps --build backend

echo "--> Rolling celery_worker"
${COMPOSE} up -d --no-deps --build celery_worker

echo "--> Rolling celery_beat"
${COMPOSE} up -d --no-deps --build celery_beat

echo "--> Rolling frontend (publishes new static bundle into shared volume)"
${COMPOSE} up -d --no-deps --build frontend

echo "--> Reloading nginx in place"
${COMPOSE} exec -T nginx nginx -s reload

echo "--> Health check"
if curl -fsS http://localhost/api/v1/health/ >/dev/null 2>&1; then
    echo "  health endpoint OK"
else
    CODE=$(curl -fsS -o /dev/null -w "%{http_code}\n" http://localhost/api/v1/auth/login/ || true)
    # 405 = Method Not Allowed on POST-only endpoint — still proves the app is up.
    if [ "${CODE}" = "405" ]; then
        echo "  login endpoint returned 405 (expected for GET) — liveness OK"
    else
        echo "  WARNING: health check inconclusive (login returned ${CODE})" >&2
    fi
fi

END_TS=$(date +%s)
DURATION=$((END_TS - START_TS))
echo "=============================================================="
echo " Deploy complete — ${DURATION}s"
echo "=============================================================="
