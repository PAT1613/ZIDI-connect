# ZIDI Connect — Operations Scripts

These three scripts cover the full lifecycle of a ZIDI Connect production host.
Run them in this order, with the cadence shown.

| Script           | When to run                          | Run as                       |
| ---------------- | ------------------------------------ | ---------------------------- |
| `init_server.sh` | Once, on a fresh Ubuntu 22.04 VPS    | `root` (via `sudo`)          |
| `deploy.sh`      | Every release / code change          | `deploy` user                |
| `backup.sh`      | Nightly via cron (and ad-hoc)        | `root` or member of `docker` |

---

## 1. `init_server.sh` — first boot

One-time hardening + Docker install for a brand-new Ubuntu 22.04 server.

- Applies all pending security updates and enables `unattended-upgrades`.
- Installs `ufw` (deny incoming, allow SSH/80/443) and `fail2ban`.
- Installs Docker Engine + Compose plugin from Docker's official APT repo.
- Creates the `deploy` user, adds it to the `docker` group, and seeds
  `/home/deploy/.ssh/authorized_keys` (you paste your public keys in).

```bash
sudo bash scripts/init_server.sh
```

After it finishes, follow the printed "next steps" to clone the repo,
fill in `.env`, drop your TLS cert + key into `nginx/certs/`, and run
the first deploy.

## 2. `deploy.sh` — every release

Idempotent zero-stash deploy. Run after `git push` to main.

- Confirms `.env` exists and warns on a dirty working tree (does not stash).
- `git pull --ff-only`, then `docker compose build --pull` for backend + frontend.
- Runs `migrate` and `collectstatic` in throwaway containers.
- Rolls services one at a time with `--no-deps` so the API, workers, and
  static bundle each cut over independently — Nginx stays up the whole time
  and is finally reloaded in place (`nginx -s reload`).
- Probes `/api/v1/health/`, falling back to `/api/v1/auth/login/` (a `405`
  from a `GET` against a `POST`-only endpoint still proves the app is alive).

```bash
./scripts/deploy.sh
```

## 3. `backup.sh` — nightly

- Streams `pg_dump --no-owner --clean` out of the `db` container, gzipped
  into `${BACKUP_DIR:-/var/backups/zidi-connect}`.
- Filename: `zidi_<db>_<YYYYMMDD_HHMMSS>.sql.gz`.
- Refuses to keep a dump smaller than 1 KB (catches silent dump failures).
- Prunes dumps older than `${RETENTION_DAYS:-30}` days.

Install as a cron job:

```cron
0 2 * * * /opt/zidi-connect/scripts/backup.sh >> /var/log/zidi-backup.log 2>&1
```
