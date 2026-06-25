# ZIDI Connect

**Customer Management, Service, Invoicing, Notification & Reporting Platform**

A production-ready full-stack system that lets organizations manage customers, services, invoices, payments, communications, due-date reminders, escalations, and reporting from a single dashboard.

---

## Stack

- **Backend** — Django 5 + DRF + JWT, Celery + Redis, PostgreSQL 16
- **Frontend** — React 19 + Vite + Tailwind CSS + React Query + React Router
- **SMS** — Africa's Talking
- **Email** — SMTP
- **Reports** — PDF (reportlab) + Excel (openpyxl)
- **Deploy** — Docker Compose + Nginx + Gunicorn on a generic Ubuntu VPS

See [`TECH_SPEC.md`](./TECH_SPEC.md) for the locked architecture contract.

---

## Quick start (local dev with Docker)

```bash
# 1. Clone, copy env, edit secrets
cp .env.example .env
nano .env                          # set DJANGO_SECRET_KEY, AT_API_KEY, EMAIL_*

# 2. Build & start everything
docker compose up -d --build

# 3. Watch logs until backend is ready
docker compose logs -f backend

# 4. Open the apps
#    Frontend (Vite dev):  http://localhost:5173
#    Backend API:          http://localhost:8000/api/v1/
#    Django Admin:         http://localhost:8000/admin/
#    Default superuser:    admin@zidi.local / ChangeMe!123
```

The backend `entrypoint.sh` waits for Postgres, runs migrations, collects static files, and bootstraps the default roles + superuser on first boot.

---

## Local dev without Docker

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Celery (separate terminals)
celery -A zidi_connect worker -l info
celery -A zidi_connect beat   -l info

# Frontend
cd frontend
npm install
npm run dev
```

---

## Production deploy (Ubuntu VPS)

See **[`docs/08_deployment.md`](./docs/08_deployment.md)** for the full runbook.

TL;DR:

```bash
ssh deploy@your-vps
git clone <your-repo> /opt/zidi-connect && cd /opt/zidi-connect
cp .env.example .env && nano .env             # set production secrets
docker compose -f docker-compose.prod.yml up -d --build
./scripts/deploy.sh                            # zero-downtime deploys after the first
```

---

## Project layout

```
ZIDI-Connect/
├── backend/      Django + DRF + Celery
├── frontend/     React 19 + Vite + Tailwind
├── nginx/        Production reverse proxy
├── scripts/      deploy.sh, backup.sh
├── docs/         8-phase engineering documentation
├── docker-compose.yml         (dev)
├── docker-compose.prod.yml    (prod)
├── .env.example
└── TECH_SPEC.md
```

---

## Documentation

| Phase | File |
|---|---|
| 1. System Analysis | [`docs/01_system_analysis.md`](./docs/01_system_analysis.md) |
| 2. System Design | [`docs/02_system_design.md`](./docs/02_system_design.md) |
| 3. Database Design | [`docs/03_database_design.md`](./docs/03_database_design.md) |
| 4. Backend | [`docs/04_backend.md`](./docs/04_backend.md) |
| 5. Frontend | [`docs/05_frontend.md`](./docs/05_frontend.md) |
| 6. Notification Engine | [`docs/06_notification_engine.md`](./docs/06_notification_engine.md) |
| 7. Testing | [`docs/07_testing.md`](./docs/07_testing.md) |
| 8. Deployment | [`docs/08_deployment.md`](./docs/08_deployment.md) |

---

## Default roles

Bootstrapped by `apps.accounts.management.commands.seed_roles`:

1. **Super Admin** — full CRUD across every module
2. **Customer Service Officer** — customers, subscriptions, communications, escalations
3. **Finance Officer** — invoices, payments, finance reports
4. **Operations Officer** — services, subscriptions, escalations
5. **Manager** — read-only across everything + escalation oversight

---

## License

MIT — see [LICENSE](./LICENSE).
