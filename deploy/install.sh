#!/usr/bin/env bash
# ============================================================================
# One-shot install script for self-hosted deploy.
# ----------------------------------------------------------------------------
# این اسکریپت روی Ubuntu 22.04 / 24.04 یا Debian 12 تست شده. روی توزیع‌های
# دیگه ممکنه نیاز به تنظیم داشته باشه.
#
# قبل از اجرا:
#   - با کاربر root یا sudo وارد شو
#   - دامنه را در DNS به IP سرور وصل کن
#   - فایل .env را با مقادیر واقعی پر کن (CRON_SECRET, DATABASE_URL, ...)
#
# استفاده:
#   chmod +x deploy/install.sh
#   sudo ./deploy/install.sh
# ============================================================================
set -euo pipefail

# ---------- تنظیمات قابل تغییر ----------
APP_DIR="${APP_DIR:-/var/www/fm-blog}"
APP_USER="${APP_USER:-fmblog}"
APP_PORT="${APP_PORT:-3000}"
DOMAIN="${DOMAIN:-your-domain.com}"
EMAIL="${EMAIL:-admin@your-domain.com}"  # برای certbot

# ---------- رنگ‌ها ----------
RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BLUE=$'\e[34m'; NC=$'\e[0m'
info()    { echo "${BLUE}[INFO]${NC} $*"; }
success() { echo "${GREEN}[OK]${NC}   $*"; }
warn()    { echo "${YELLOW}[WARN]${NC} $*"; }
fail()    { echo "${RED}[FAIL]${NC} $*"; exit 1; }

# ---------- چک root ----------
if [[ $EUID -ne 0 ]]; then
    fail "این اسکریپت باید با sudo اجرا بشه."
fi

# ---------- سیستم‌عامل ----------
. /etc/os-release
info "سیستم‌عامل: $PRETTY_NAME"

# ---------- نصب پیش‌نیازها ----------
info "نصب Node.js 20 LTS، Nginx، PM2..."
export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release nginx ufw jq

# Node.js 20 (Nodesource)
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]]; then
    info "نصب Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

success "Node $(node -v) — npm $(npm -v)"

# PM2
if ! command -v pm2 >/dev/null 2>&1; then
    info "نصب PM2..."
    npm install -g pm2
fi
success "PM2 $(pm2 -v)"

# ---------- کاربر و پوشه ----------
info "ساخت کاربر $APP_USER و پوشه $APP_DIR..."
if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --shell /bin/bash "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------- کپی فایل‌ها (اگه الان deploy می‌کنی) ----------
# اگه این اسکریپت روی سرور از روت پروژه اجرا می‌شه، خودش فایل‌ها رو کپی می‌کنه
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    info "کپی پروژه از $PROJECT_ROOT به $APP_DIR..."
    rsync -a --delete \
        --exclude 'node_modules' --exclude '.next' --exclude '.git' \
        --exclude '.env' --exclude '.env.local' --exclude 'logs' \
        "$PROJECT_ROOT/" "$APP_DIR/"
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
else
    warn "package.json در $PROJECT_ROOT پیدا نشد — فرض بر اینه که فایل‌ها قبلاً deploy شدن."
fi

# ---------- .env ----------
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    warn ".env در $ENV_FILE پیدا نشد. از .env.example کپی می‌کنم تا دستی پرش کنی."
    cp "$APP_DIR/.env.example" "$ENV_FILE"
    # CRON_SECRET تصادفی اگه خالی بود
    if grep -qE '^CRON_SECRET=""$' "$ENV_FILE"; then
        SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        sed -i "s|^CRON_SECRET=\"\"|CRON_SECRET=\"$SECRET\"|" "$ENV_FILE"
        success "CRON_SECRET تصادفی ساخته شد."
    fi
    chown "$APP_USER:$APP_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    warn "قبل از ادامه حتماً $ENV_FILE را ویرایش کن (DATABASE_URL, NEXTAUTH_URL, ...)."
fi

# ---------- build ----------
info "نصب dependencies و build..."
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --no-audit --no-fund
sudo -u "$APP_USER" NODE_ENV=production npx prisma generate
sudo -u "$APP_USER" npm run build

# ---------- pm2 ----------
info "راه‌اندازی اپ با PM2..."
sudo -u "$APP_USER" pm2 startOrRestart "$APP_DIR/deploy/ecosystem.config.cjs" --env production
sudo -u "$APP_USER" pm2 save

# ---------- systemd startup ----------
info "فعال‌سازی PM2 در boot..."
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | grep -E '^sudo' | bash || true

# ---------- Nginx ----------
info "نصب config Nginx..."
NGINX_CONF="/etc/nginx/sites-available/fm-blog"
sed -e "s/your-domain.com/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf.example" > "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/fm-blog
# پاک کردن default
rm -f /etc/nginx/sites-enabled/default
nginx -t

# ---------- SSL با certbot ----------
if command -v certbot >/dev/null 2>&1; then
    :
else
    info "نصب certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx
fi

if [[ "$DOMAIN" != "your-domain.com" ]]; then
    info "دریافت گواهی SSL برای $DOMAIN..."
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || \
        warn "certbot شکست خورد. بعداً با 'sudo certbot --nginx -d $DOMAIN' دستی اجرا کن."
fi
systemctl reload nginx

# ---------- فایروال ----------
info "تنظیم UFW..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable || true

# ---------- cron ----------
info "نصب crontab برای endpointهای cron..."
CRON_FILE="/etc/cron.d/fm-blog-cron"
sed -e "s|YOUR_DOMAIN.com|$DOMAIN|g" \
    -e "s|YOUR_CRON_SECRET|$(grep -E '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')|g" \
    "$APP_DIR/deploy/crontab.example" > "$CRON_FILE"
chmod 644 "$CRON_FILE"
# /etc/cron.d فایل‌ها باید user داشته باشند
if ! grep -q "^root" "$CRON_FILE"; then
    sed -i "1i root" "$CRON_FILE"
fi
success "crontab در $CRON_FILE نصب شد."

# ---------- لاگ‌ها ----------
mkdir -p /var/log/pm2
touch /var/log/fm-cron.log
chown -R "$APP_USER:$APP_USER" /var/log/pm2 /var/log/fm-cron.log

# ---------- چک نهایی ----------
sleep 3
info "چک وضعیت..."
pm2 status

success "نصب تمام شد! 🎉"
echo
echo "  سایت:  https://$DOMAIN"
echo "  لاگ:    pm2 logs fm-blog"
echo "  وضعیت: pm2 status"
echo "  ری‌استارت: pm2 restart fm-blog"
echo
echo "اگه domain یا env را عوض کردی:"
echo "  cd $APP_DIR && npm run deploy:rebuild"