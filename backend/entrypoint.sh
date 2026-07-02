#!/bin/sh
set -e

: "${POSTGRES_HOST:=db}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:=zidi}"
: "${POSTGRES_DB:=zidi_connect}"

echo "[entrypoint] Waiting for Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; do
    sleep 2
done
echo "[entrypoint] Postgres is ready."

echo "[entrypoint] Running migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput || true

echo "[entrypoint] Seeding roles..."
python manage.py seed_roles || true

# Bootstrap admin ONLY when both credentials are explicitly set.
# There is NO fallback default password — a fresh boot without these env vars
# leaves the DB with no superuser (create one with `manage.py createsuperuser`).
if [ -n "${DJANGO_SUPERUSER_EMAIL}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD}" ]; then
    echo "[entrypoint] Bootstrap superuser: ${DJANGO_SUPERUSER_EMAIL}"
    python manage.py shell -c "
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
import os, sys
U = get_user_model()
email = os.environ['DJANGO_SUPERUSER_EMAIL']
password = os.environ['DJANGO_SUPERUSER_PASSWORD']
full_name = os.environ.get('DJANGO_SUPERUSER_FULL_NAME', 'Super Admin')

# Weak-password guard for prod boots. Django's DEBUG comes from settings.
from django.conf import settings
if not settings.DEBUG and len(password) < 12:
    print('WARNING: DJANGO_SUPERUSER_PASSWORD is < 12 chars in a non-debug environment.', file=sys.stderr)
    print('Bootstrap will still proceed — rotate this password immediately.', file=sys.stderr)

if not U.objects.filter(email=email).exists():
    U.objects.create_superuser(email=email, password=password, full_name=full_name)
    print('Superuser created.')
else:
    print('Superuser already exists.')

# Idempotent role reconcile.
user = U.objects.get(email=email)
role = Role.objects.filter(name='Super Admin').first()
if role and user.role_id != role.id:
    user.role = role
    user.save(update_fields=['role'])
    print('Assigned Super Admin role.')
"
else
    echo "[entrypoint] DJANGO_SUPERUSER_EMAIL/PASSWORD not set — no superuser bootstrap."
    echo "[entrypoint] Create one with: python manage.py createsuperuser"
fi

echo "[entrypoint] Starting: $*"
exec "$@"
