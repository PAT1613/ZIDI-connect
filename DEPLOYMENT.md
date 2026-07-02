# ZIDI Connect — Production Deployment

This is the security-first checklist for taking ZIDI Connect to production. For a step-by-step VPS runbook (Nginx, TLS, backups), see [`docs/08_deployment.md`](./docs/08_deployment.md); this file is the invariants those steps must satisfy.

---

## 1. Environment — non-negotiables

Put every secret in `.env` at the repo root (kept off git via `.gitignore`). Do NOT bake secrets into images or committed compose files.

```bash
# --- Django ---
DJANGO_SECRET_KEY=              # 64+ char random. NEVER reuse across environments.
DJANGO_DEBUG=False              # MUST be False in prod.
DJANGO_ALLOWED_HOSTS=zidi.example.com,api.zidi.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://zidi.example.com,https://api.zidi.example.com
CORS_ALLOWED_ORIGINS=https://zidi.example.com

# --- Database ---
POSTGRES_DB=zidi_connect
POSTGRES_USER=zidi
POSTGRES_PASSWORD=              # 24+ char random. Rotate quarterly.
POSTGRES_HOST=db
POSTGRES_PORT=5432

# --- Redis / Celery ---
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# --- JWT ---
JWT_ACCESS_LIFETIME_MIN=60
JWT_REFRESH_LIFETIME_DAYS=7

# --- Webhook shared secret ---
# REQUIRED for the delivery-report callback (A4) — Africa's Talking POSTs the
# X-Webhook-Secret header, we compare with hmac.compare_digest. Missing/wrong
# secret → 403. Rotate at the same time as AT_API_KEY.
WEBHOOK_SHARED_SECRET=

# --- SMS / Email providers ---
AT_USERNAME=production           # NOT `sandbox` in real prod.
AT_API_KEY=
AT_SENDER_ID=ZIDI
EMAIL_HOST=smtp.provider.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL="ZIDI Connect <noreply@zidi.example.com>"

# --- Superuser bootstrap ---
# Leaving these EMPTY is the secure default. Prefer:
#   docker compose exec backend python manage.py createsuperuser
# If you set them, use a strong password. The entrypoint warns (but still
# creates) if the password is < 12 chars in a non-debug environment.
DJANGO_SUPERUSER_EMAIL=
DJANGO_SUPERUSER_PASSWORD=
DJANGO_SUPERUSER_FULL_NAME=
```

Generate secrets:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"   # DJANGO_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"   # WEBHOOK_SHARED_SECRET
```

---

## 2. What the entrypoint will/won't do

The Docker `entrypoint.sh` runs on every backend container start:

1. Waits for Postgres.
2. Runs migrations (`migrate --noinput`).
3. Collects static files.
4. Seeds the five roles (`seed_roles` — idempotent).
5. **Superuser bootstrap — only when both `DJANGO_SUPERUSER_EMAIL` and `DJANGO_SUPERUSER_PASSWORD` are set.** There is **no default password**. If either env var is empty, the entrypoint skips creation and logs a hint to use `manage.py createsuperuser`.
6. If a superuser is created OR already exists, it's idempotently reconciled to the `Super Admin` role.
7. Weak-password warning: if `DEBUG=False` and the bootstrap password is < 12 chars, the entrypoint logs a WARNING to stderr but still proceeds. Rotate the password.

---

## 3. Reverse-proxy + TLS

Nginx (see `nginx/`) terminates TLS and forwards to the backend on port 8000. **Never expose Django's dev server (`runserver`) directly** — production uses Gunicorn behind Nginx via `docker-compose.prod.yml`.

Nginx must set these headers when proxying to Django:

```
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
```

Django needs `USE_X_FORWARDED_HOST = True` and `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` when behind a TLS-terminating proxy. Verify those are set (or add them) before going live.

---

## 4. Webhook endpoints

These endpoints intentionally bypass user authentication because a server-to-server caller can't produce a JWT. They are guarded by the shared secret instead:

| Route | Guard |
|---|---|
| `POST /api/v1/notifications/delivery-callback/` | `X-Webhook-Secret` header must equal `WEBHOOK_SHARED_SECRET` (constant-time compare via `hmac.compare_digest`). |

Register the callback URL in the Africa's Talking dashboard, and set the outgoing header there. Rotate `WEBHOOK_SHARED_SECRET` and the AT API key together — a leaked secret is a spam-injection vector.

---

## 5. Post-deploy verification

```bash
# 1. DEBUG is off.
docker compose exec backend python manage.py diffsettings | grep DEBUG

# 2. No default superuser was created.
docker compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
print('superusers:', list(U.objects.filter(is_superuser=True).values_list('email', flat=True)))
"

# 3. Webhook returns 403 without the secret.
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  https://api.zidi.example.com/api/v1/notifications/delivery-callback/ \
  -H 'Content-Type: application/json' -d '{}'
# Expect: 403

# 4. Deliver a real callback (rotate the secret used here immediately after).
curl -sS -X POST https://api.zidi.example.com/api/v1/notifications/delivery-callback/ \
  -H 'Content-Type: application/json' \
  -H 'X-Webhook-Secret: <your-secret>' \
  -d '{"id":"nonexistent","status":"Success"}'
# Expect: {"detail":"not found"} — 404 (URL exists, message id doesn't).

# 5. Celery Beat is running the scheduled tasks.
docker compose logs celery_beat | grep -E 'scan-due-subscriptions|generate-due-invoices'
```

---

## 6. Ongoing hygiene

- **Backups**: `scripts/backup.sh` dumps Postgres nightly. Ship the dump off-host.
- **Log retention**: `docker compose logs` is only useful for hours-old debugging — pipe to a real store (Loki, CloudWatch, whatever).
- **Secret rotation**: quarterly, at minimum, for `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, `AT_API_KEY`, `EMAIL_HOST_PASSWORD`, `WEBHOOK_SHARED_SECRET`. Rotate the Django key with a downtime window — session cookies and any signed tokens invalidate.
- **User audit**: the audit log (`/api/v1/audit-logs/`) records writes. Review it after any credential rotation.
- **Integration seams**: `/api/v1/reports/accounting-export/` returns CSV/XLSX ready for QuickBooks/Xero import. A future push-to-accounting-API webhook would live in `apps/reporting/views.py:AccountingExportView`.

---

## 7. What is NOT hardened yet

Ship-blockers if any of these matter to your threat model:

- No rate-limiting on `/auth/login/` — susceptible to credential stuffing. Add `django-axes` or fronted rate limiting.
- No 2FA on the Django Admin.
- Webhook signature is a shared secret (fine for internal); switch to HMAC-signed timestamped payloads if you go multi-tenant.
- `SECURE_HSTS_SECONDS` and cookie-hardening flags (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`) aren't set — add them alongside your TLS rollout.
