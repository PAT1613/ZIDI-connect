# ZIDI Connect — Locked Technical Specification

This document is the **single source of truth** for cross-cutting design decisions.
Backend, frontend, docs, and deployment must all conform to this contract.

---

## 1. Stack (frozen)

| Layer | Choice |
|---|---|
| Backend framework | Django 5.0.x + DRF 3.15.x |
| Auth | JWT via `djangorestframework-simplejwt` |
| DB | PostgreSQL 16 |
| Cache / broker | Redis 7 |
| Async | Celery 5.4 + Celery Beat |
| Frontend | React 19 + Vite 5 + Tailwind CSS 3 |
| HTTP client | Axios + TanStack React Query v5 |
| Router | React Router v6 |
| SMS | Africa's Talking (`africastalking` Python SDK) |
| Email | SMTP (Django default backend, swappable) |
| PDF export | `reportlab` |
| Excel export | `openpyxl` |
| Web server (prod) | Gunicorn behind Nginx |
| Container | Docker + Docker Compose |
| Deploy target | Generic Ubuntu 22.04 VPS |

---

## 2. API contract

- Base URL: `/api/v1/`
- Auth: `Authorization: Bearer <jwt_access_token>`
- Token endpoint: `POST /api/v1/auth/login/` → `{ access, refresh, user }`
- Refresh:       `POST /api/v1/auth/refresh/` → `{ access }`
- All list endpoints support `?page=`, `?page_size=`, `?search=`, `?ordering=`
- Pagination: `{ count, next, previous, results: [] }`
- Errors: `{ detail: "..." }` or `{ field_name: ["..."] }`

### Endpoint map (locked)

```
auth/login/                POST
auth/refresh/              POST
auth/logout/               POST
auth/me/                   GET

users/                     GET POST
users/<id>/                GET PATCH DELETE
roles/                     GET POST

customers/                 GET POST
customers/<id>/            GET PATCH DELETE
customers/<id>/deactivate/ POST

services/                  GET POST
services/<id>/             GET PATCH DELETE

subscriptions/             GET POST
subscriptions/<id>/        GET PATCH DELETE
subscriptions/<id>/renew/  POST
subscriptions/<id>/suspend/POST
subscriptions/<id>/terminate/ POST

invoices/                  GET POST
invoices/<id>/             GET PATCH DELETE
invoices/<id>/pdf/         GET           (returns application/pdf)

payments/                  GET POST
payments/<id>/             GET

communications/sms/        POST          (single or bulk)
communications/email/      POST          (single or bulk)
communications/logs/       GET

notifications/             GET           (in-app feed for current user)
notifications/<id>/read/   POST

escalations/               GET POST
escalations/<id>/          GET PATCH

reports/dashboard/         GET
reports/customers/         GET ?format=pdf|xlsx
reports/services/          GET ?format=pdf|xlsx
reports/revenue/           GET ?format=pdf|xlsx
reports/invoices/          GET ?format=pdf|xlsx
reports/payments/          GET ?format=pdf|xlsx
reports/notifications/     GET ?format=pdf|xlsx

audit-logs/                GET
```

---

## 3. Data model (canonical names)

All FKs use `on_delete=PROTECT` unless noted. All tables have `created_at`, `updated_at`.

- **User** (extends AbstractUser) — `email` is the USERNAME_FIELD, plus `phone`, `role` FK, `is_active`
- **Role** — `name` (Super Admin / Customer Service Officer / Finance Officer / Operations Officer / Manager), `description`
- **Customer** — `customer_code` (auto: `CUS-000001`), `full_name`, `phone`, `email`, `address`, `national_id` (unique), `status` (active/inactive), `registration_date`
- **Service** — `service_code` (auto: `SVC-000001`), `name`, `description`, `price` (decimal 12,2), `sla_days` (int), `billing_cycle` (monthly/quarterly/annual/one-off), `status` (active/inactive)
- **CustomerService** — `customer` FK, `service` FK, `start_date`, `end_date`, `renewal_date`, `due_date`, `status` (active/suspended/terminated/expired), `auto_renew` bool
- **Invoice** — `invoice_number` (auto: `INV-000001`), `customer` FK, `customer_service` FK nullable, `amount`, `tax`, `total`, `status` (paid/pending/overdue/cancelled), `issued_date`, `due_date`, `notes`
- **Payment** — `invoice` FK, `amount`, `method` (mobile_money/bank_transfer/cash), `reference`, `paid_at`, `received_by` FK User
- **Notification** — `customer` FK nullable, `customer_service` FK nullable, `user` FK nullable (for in-app), `channel` (sms/email/in_app), `subject`, `message`, `status` (queued/sent/failed/delivered), `sent_at`, `delivery_status`, `provider_message_id`
- **CommunicationLog** — `sender` FK User, `customer` FK, `channel`, `message`, `status`, `sent_at`
- **Escalation** — `customer_service` FK, `assigned_to` FK User nullable, `status` (open/in_progress/resolved/closed), `opened_at`, `resolved_at`, `notes`
- **AuditLog** — `user` FK nullable, `action`, `module`, `object_repr`, `old_value` JSON, `new_value` JSON, `ip_address`, `created_at`

---

## 4. Roles & permissions matrix

| Module | Super Admin | CS Officer | Finance | Operations | Manager |
|---|---|---|---|---|---|
| Users / Roles | CRUD | — | — | — | R |
| Customers | CRUD | CRUD | R | R | R |
| Services | CRUD | R | R | CRUD | R |
| Subscriptions | CRUD | CRUD | R | CRUD | R |
| Invoices | CRUD | R | CRUD | R | R |
| Payments | CRUD | — | CRUD | — | R |
| Communications | CRUD | CRUD | — | CRUD | R |
| Notifications | CRUD | R | R | R | R |
| Escalations | CRUD | CRUD | R | CRUD | CRUD |
| Reports | All | Customer/Comms | Finance | Service | All |
| Audit Logs | R | — | — | — | R |

---

## 5. Notification engine rules

- Celery Beat runs `apps.notifications.tasks.scan_due_subscriptions` **hourly**.
- For each active `CustomerService`:
  - If `due_date - today` ∈ {14, 7, 3}: enqueue reminder (SMS + Email + InApp) — one per interval, deduped by `(subscription_id, interval)`.
  - If `due_date < today` and not paid: mark `status=expired`, enqueue overdue notice, create `Escalation` (open) assigned by round-robin to active CS Officers.
- SMS via Africa's Talking; Email via SMTP. Failures retry 3× with exponential backoff (60s, 5m, 30m).
- All notifications written to `Notification` table with `status` and `provider_message_id`.

Reminder message template:
```
Dear {full_name}, your subscription to {service_name} is due on {due_date}.
Amount: KES {amount}. Renew via {renewal_url} or reply HELP. — ZIDI Connect
```

---

## 6. Environment variables (single .env at project root)

```
# Django
DJANGO_SECRET_KEY=
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost,http://127.0.0.1

# DB
POSTGRES_DB=zidi_connect
POSTGRES_USER=zidi
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis / Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# JWT
JWT_ACCESS_LIFETIME_MIN=60
JWT_REFRESH_LIFETIME_DAYS=7

# SMS — Africa's Talking
AT_USERNAME=sandbox
AT_API_KEY=
AT_SENDER_ID=ZIDI

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=ZIDI Connect <noreply@zidi.local>

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 7. Ports

| Service | Port |
|---|---|
| Django dev | 8000 |
| Gunicorn (internal) | 8000 |
| Nginx | 80 / 443 |
| Postgres | 5432 |
| Redis | 6379 |
| Vite dev | 5173 |
| Flower (optional) | 5555 |

---

## 8. Directory layout (frozen)

```
ZIDI-Connect/
├── backend/
│   ├── zidi_connect/         # project (settings, urls, celery)
│   ├── apps/
│   │   ├── accounts/
│   │   ├── customers/
│   │   ├── services/
│   │   ├── subscriptions/
│   │   ├── invoicing/
│   │   ├── communications/
│   │   ├── notifications/
│   │   ├── escalations/
│   │   ├── reporting/
│   │   ├── audit/
│   │   └── common/           # shared mixins, pagination, permissions
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── routes/
│   │   └── lib/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── Dockerfile
│   └── nginx.conf
├── nginx/
│   └── nginx.conf            # production reverse proxy
├── scripts/
│   ├── deploy.sh
│   └── backup.sh
├── docs/
│   ├── 01_system_analysis.md
│   ├── 02_system_design.md
│   ├── 03_database_design.md
│   ├── 04_backend.md
│   ├── 05_frontend.md
│   ├── 06_notification_engine.md
│   ├── 07_testing.md
│   ├── 08_deployment.md
│   └── diagrams/             # Mermaid sources
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
└── README.md
```
