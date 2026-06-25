#!/usr/bin/env bash
#
# ZIDI Connect — Postgres backup script.
# Streams pg_dump from the running `db` container, gzips to BACKUP_DIR,
# and prunes dumps older than RETENTION_DAYS.
#
# Suggested cron (run as root or a user in the docker group):
#   0 2 * * * /opt/zidi-connect/scripts/backup.sh >> /var/log/zidi-backup.log 2>&1

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

if [ ! -f ".env" ]; then
    echo "ERROR: .env not found at ${PROJECT_ROOT}/.env" >&2
    exit 1
fi

# Pull POSTGRES_* out of .env without leaking values into the shell history.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

: "${POSTGRES_DB:?POSTGRES_DB must be set in .env}"
: "${POSTGRES_USER:?POSTGRES_USER must be set in .env}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/zidi-connect}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPOSE="docker compose -f docker-compose.prod.yml"

mkdir -p "${BACKUP_DIR}"

STAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="zidi_${POSTGRES_DB}_${STAMP}.sql.gz"
DEST="${BACKUP_DIR}/${FILENAME}"

echo "[backup] dumping ${POSTGRES_DB} -> ${DEST}"

# --no-owner so the dump restores cleanly on any cluster; --clean drops existing
# objects on restore so we get a deterministic end state.
${COMPOSE} exec -T db pg_dump \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --no-owner --clean \
    | gzip > "${DEST}"

# Sanity check — a successful dump is always larger than 1 KB.
SIZE_BYTES=$(stat -c '%s' "${DEST}" 2>/dev/null || stat -f '%z' "${DEST}")
if [ "${SIZE_BYTES}" -lt 1024 ]; then
    echo "ERROR: backup ${DEST} is suspiciously small (${SIZE_BYTES} bytes) — aborting" >&2
    # Guarded delete — path is the file we just created in BACKUP_DIR.
    rm -f -- "${DEST}"
    exit 1
fi

# Optional: snapshot Redis too. Comment out if Redis is purely a cache.
# ${COMPOSE} exec -T redis redis-cli SAVE >/dev/null || echo "[backup] redis SAVE skipped"

# Retention sweep — only touches our own gzip dumps inside BACKUP_DIR.
find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'zidi_*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

SIZE_H=$(du -h "${DEST}" | cut -f1)
echo "[backup] OK ${FILENAME} (${SIZE_H}) — retention ${RETENTION_DAYS}d"
