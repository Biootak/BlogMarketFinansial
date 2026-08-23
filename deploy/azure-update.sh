#!/usr/bin/env bash
# ============================================================================
# Canonical Azure deploy — pull + redeploy (روش استاندارد دیپلوی).
# ----------------------------------------------------------------------------
# این اسکریپت روی Azure VM (fm-vm) اجرا می‌شود و سایت را به آخرین کد
# `origin/main` می‌رساند: git pull → docker compose pull → up -d → prune.
#
# تصویرها را GitHub Actions build و به ghcr.io push می‌کند (workflow:
# .github/workflows/docker-build-push.yml) — اینجا فقط pull می‌شود.
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
#   - pull با retry (۵ بار × ۳۰ ثانیه): بلافاصله بعد از push، CI هنوز دارد
#     تصویر را build می‌کند؛ این retry فاصله را می‌بندد.
#   - `up -d` فقط در صورت تغییر تصویر کانتینر را recreate می‌کند → بدون
#     downtime (تا pull تمام نشود، نسخهٔ قبلی به سرویس ادامه می‌دهد).
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
HEAD_BEFORE=$(git rev-parse HEAD)
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"
HEAD_AFTER=$(git rev-parse HEAD)
GIT_CHANGED=$([[ "$HEAD_BEFORE" != "$HEAD_AFTER" ]] && echo 1 || echo 0)

# FIX (2026-08-22 — رِیس واقعی): اگر git جلو رفت ولی compose pull تصویر قدیمی
# را گرفت (CI هنوز تمام نکرده و تگ :main هنوز عوض نشده)، pull «موفق» است ولی
# هیچ چیز آپدیت نمی‌شود؛ قبلاً سنتینل نوشته می‌شد و دیپلوی برای همیشه می‌ماند.
# حالا: اگر git تغییر کرده ولی ID تصویر وب بعد از up عوض نشد → بدون نوشتن
# sentinel خارج می‌شویم تا دقیقهٔ بعد دوباره تلاش شود تا تصویر جدید بیاید.

# FIX (2026-08-23 — سناریوی واقعی 332a6d7c): گارد قبلی فقط وقتی کار می‌کرد که
# در همان اجرا git جلو رفته باشد (GIT_CHANGED=1). اما در تلاشِ دقیقهٔ بعد git
# دیگر جلو نمی‌رود (pull قبلی انجام شده) → گارد رد می‌شد → با تصویر قدیمی
# «موفق» اعلام و sentinel نوشته می‌شد → cron هرگز دوباره تلاش نمی‌کرد و سایت
# ساعت‌ها روی بیلد قبلی ماند.
#
# راه‌حل قطعی: CI برای هر کامیت تگ immutable «sha-<short>» هم publish می‌کند
# (docker-build-push.yml). پس قبل از هر چیز باید آن تگ برای HEAD فعلی در
# ghcr موجود باشد؛ نبودِ آن = CI هنوز تمام نکرده، بدون توجه به وضعیت git
# بدون sentinel خارج شو تا دقیقهٔ بعد دوباره تلاش شود.

IMG_REF="${WEB_IMAGE:-ghcr.io/biootak/fm-blog-web:main}"
SHA_TAG="${IMG_REF%:*}:sha-$(git rev-parse --short HEAD)"

IMAGE_READY=0
for i in 1 2 3 4 5 6 7 8 9 10; do
    if docker manifest inspect "$SHA_TAG" >/dev/null 2>&1; then
        IMAGE_READY=1
        break
    fi
    info "⏳ تصویر $SHA_TAG هنوز در ghcr نیست (CI در حال build؟) — تلاش $i/10، ۳۰ ثانیه بعد..."
    sleep 30
done
if [[ "$IMAGE_READY" != "1" ]]; then
    info "❌ بعد از ۵ دقیقه تصویر $SHA_TAG منتشر نشد — نسخهٔ قبلی همچنان سرویس می‌دهد."
    exit 1
fi

IMG_BEFORE=$(docker compose --env-file "$REPO_DIR/.env" \
    -f "$REPO_DIR/deploy/docker-compose.azure.yml" images -q web 2>/dev/null || true)

# pull تصویرهای جدید از ghcr — با retry تا CI build تمام شود
for i in 1 2 3 4 5; do
    if docker compose --env-file "$REPO_DIR/.env" \
        -f "$REPO_DIR/deploy/docker-compose.azure.yml" pull; then
        break
    fi
    info "⚠️ pull تلاش $i/5 ناموفق بود (CI هنوز در حال build؟) — ۳۰ ثانیه بعد دوباره..."
    sleep 30
    if [[ $i -eq 5 ]]; then
        info "❌ pull بعد از ۵ تلاش ناموفق — نسخهٔ قبلی همچنان سرویس می‌دهد."
        exit 1
    fi
done

# بالا آوردن کانتینرها (فقط در صورت تغییر تصویر recreate می‌شوند)
docker compose --env-file "$REPO_DIR/.env" \
    -f "$REPO_DIR/deploy/docker-compose.azure.yml" up -d

IMG_AFTER=$(docker compose --env-file "$REPO_DIR/.env" \
    -f "$REPO_DIR/deploy/docker-compose.azure.yml" images -q web 2>/dev/null || true)

if [[ "$GIT_CHANGED" == "1" && -n "$IMG_BEFORE" && "$IMG_BEFORE" == "$IMG_AFTER" ]]; then
    info "⚠️ git جلو رفت ولی تصویر web همان قبلی است — CI هنوز publish نکرده. بدون sentinel خارج می‌شوم تا دقیقهٔ بعد دوباره..."
    exit 1
fi

# تصاویر قدیمی را پاک کن (دیسک 32GB)
docker image prune -f >/dev/null 2>&1 || true

info "✅ آپدیت کامل شد — $(git rev-parse --short HEAD)"
