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

if [ -n "${DJANGO_SUPERUSER_EMAIL}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD}" ]; then
    echo "[entrypoint] Ensuring superuser ${DJANGO_SUPERUSER_EMAIL} exists..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
U = get_user_model()
email = os.environ['DJANGO_SUPERUSER_EMAIL']
password = os.environ['DJANGO_SUPERUSER_PASSWORD']
full_name = os.environ.get('DJANGO_SUPERUSER_FULL_NAME', 'Super Admin')
if not U.objects.filter(email=email).exists():
    U.objects.create_superuser(email=email, password=password, full_name=full_name)
    print('Superuser created.')
else:
    print('Superuser already exists.')
"
fi

echo "[entrypoint] Starting: $*"
exec "$@"
