#!/usr/bin/env bash
#
# ZIDI Connect — one-time Ubuntu 22.04 bootstrap.
# Installs Docker, configures UFW + fail2ban + unattended-upgrades,
# creates a `deploy` user, and prepares an SSH authorized_keys placeholder.
#
# Run ONCE per server, as root:
#   sudo bash scripts/init_server.sh

set -euo pipefail
IFS=$'\n\t'

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    echo "ERROR: must run as root (try: sudo $0)" >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> apt update + upgrade"
apt-get update
apt-get -y upgrade

echo "==> Installing base packages"
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    ufw \
    fail2ban \
    unattended-upgrades

echo "==> Configuring UFW (deny in, allow SSH/HTTP/HTTPS)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Enabling unattended-upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades || true
systemctl enable --now unattended-upgrades

echo "==> Enabling fail2ban"
systemctl enable --now fail2ban

echo "==> Installing Docker Engine + Compose plugin"
if docker --version >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "  Docker already installed: $(docker --version)"
else
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    UBUNTU_CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list

    apt-get update
    apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    systemctl enable --now docker
fi

echo "==> Creating deploy user"
if ! id -u deploy >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash deploy
fi
usermod -aG docker deploy

install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
AUTH_KEYS="/home/deploy/.ssh/authorized_keys"
if [ ! -f "${AUTH_KEYS}" ]; then
    cat > "${AUTH_KEYS}" <<'EOF'
# Paste each operator's SSH public key on its own line below.
# Example:
# ssh-ed25519 AAAA... ops@laptop
EOF
    chown deploy:deploy "${AUTH_KEYS}"
    chmod 0600 "${AUTH_KEYS}"
fi

cat <<'EOF'

==============================================================
 ZIDI Connect server bootstrap: complete
==============================================================

Next steps (run as the `deploy` user):

  sudo -iu deploy
  cd /opt
  sudo mkdir -p /opt/zidi-connect && sudo chown deploy:deploy /opt/zidi-connect
  git clone <your-repo-url> /opt/zidi-connect
  cd /opt/zidi-connect
  cp .env.example .env
  # ... edit .env (DB password, SECRET_KEY, AT_API_KEY, EMAIL_*, etc.)

  # Place TLS cert + key at nginx/certs/fullchain.pem and nginx/certs/privkey.pem
  # (use Certbot with the webroot at /var/www/certbot for renewals).

  ./scripts/deploy.sh

To enable nightly backups:
  sudo crontab -e
  0 2 * * * /opt/zidi-connect/scripts/backup.sh >> /var/log/zidi-backup.log 2>&1
==============================================================
EOF
