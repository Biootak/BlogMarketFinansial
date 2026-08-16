#!/usr/bin/env bash
# ============================================================================
# Canonical Azure deploy — pull + build + redeploy (روش استاندارد دیپلوی).
# ----------------------------------------------------------------------------
# این اسکریپت روی Azure VM (fm-vm) اجرا می‌شود و سایت را به آخرین کد
# `origin/main` می‌رساند: git pull → build تصویر → up -d → prune.
#
# دو جور صدا زده می‌شود:
#   ۱) خودکار — deploy/azure-auto-deploy.sh (cron هر دقیقه روی VM) وقتی commit
#      جدیدی روی GitHub دید.
#   ۲) دستی — هر وقت خواستی همین الان آپدیت کنی:
#        bash deploy/azure-update.sh
#
# متغیرهای اختیاری:
#   AZURE_REPO_DIR      مسیر clone روی VM (پیش‌فرض: $HOME/fm-blog)
#   AZURE_DEPLOY_BRANCH برنچ مبدأ (پیش‌فرض: main)
#   AZURE_DEPLOY_LOG    فایل لاگ (پیش‌فرض: /var/log/fm-blog-azure-deploy.log)
#
# امنیت/پایداری:
#   - فقط fast-forward pull — clone دست‌کاری‌شده را نمی‌پوشاند.
#   - `up -d` فقط در صورت تغییر image کانتینر را recreate می‌کند → بدون downtime
#     (در طول build چند دقیقه‌ای، نسخهٔ قبلی به سرویس ادامه می‌دهد).
#   - migrationهای Prisma خودکار اجرا می‌شوند (داخل compose، قبل از start).
# ============================================================================
set -euo pipefail

REPO_DIR="${AZURE_REPO_DIR:-$HOME/fm-blog}"
BRANCH="${AZURE_DEPLOY_BRANCH:-main}"
LOG="${AZURE_DEPLOY_LOG:-/var/log/fm-blog-azure-deploy.log}"

# ---------- لاگ (اگر /var/log در دسترس نبود → /tmp) ----------
mkdir -p "$(dirname "$LOG")" 2>/dev/null || LOG="/tmp/fm-blog-azure-deploy.log"
touch "$LOG" 2>/dev/null || LOG="/tmp/fm-blog-azure-deploy.log"
info() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

if [[ ! -d "$REPO_DIR/.git" ]]; then
    info "❌ کلون در $REPO_DIR پیدا نشد — AZURE_REPO_DIR را ست کن."
    exit 1
fi

cd "$REPO_DIR"
info "── آپدیت شروع شد (branch=$BRANCH, repo=$REPO_DIR) ──"

# آخرین کد — فقط fast-forward
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

# build تصویر جدید + بالا آوردن کانتینرها
docker compose --env-file "$REPO_DIR/.env" \
    -f "$REPO_DIR/deploy/docker-compose.azure.yml" build
docker compose --env-file "$REPO_DIR/.env" \
    -f "$REPO_DIR/deploy/docker-compose.azure.yml" up -d

# تصاویر قدیمی را پاک کن (دیسک 32GB)
docker image prune -f >/dev/null 2>&1 || true

info "✅ آپدیت کامل شد — $(git rev-parse --short HEAD)"
