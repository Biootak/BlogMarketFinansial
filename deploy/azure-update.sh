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

# FIX نسخهٔ ۲ (2026-08-23): `docker manifest inspect` روی VM بدون لاگینِ کلاینتِ
# ghcr شکست می‌خورد (auth دیمون ≠ auth کلاینت) و گیت را کور می‌کرد. به‌جای پروب
# رجیستری، معیار قطعی محلی: اگر هم git جلو نرفته باشد و هم pull هیچ ایمیج جدیدی
# نیاورده باشد (ID قبل==بعد) → یعنی هنوز چیزی برای دیپلوی نیست؛ بدون sentinel
# خارج شو تا دقیقهٔ بعد دوباره تلاش شود. هر شرط برعکس ⇒ ادامه و recreate.

IMG_REF="${WEB_IMAGE:-ghcr.io/biootak/fm-blog-web:main}"
WEB_REPO="${IMG_REF%:*}"
SHORT_SHA="$(git rev-parse --short HEAD)"
SHA_IMAGE="$WEB_REPO:sha-$SHORT_SHA"

# FIX v3 (2026-08-23): شرط قطعیِ «ایمیجِ همین کامیت منتشر شده است». CI برای هر
# کامیت تگ immutable «sha-<short>» می‌سازد؛ `docker pull` آن با auth دیمون کار
# می‌کند (برخلاف manifest inspect که auth کلاینت می‌خواهد). اگر پول نشد، هنوز
# چیزی برای دیپلوی نیست — بدون sentinel خارج شو تا دقیقهٔ بعد دوباره.
IMAGE_READY=0
for i in 1 2 3 4 5 6 7 8 9 10; do
    if docker pull -q "$SHA_IMAGE" >/dev/null 2>&1; then
        IMAGE_READY=1
        break
    fi
    info "⏳ تصویر $SHA_IMAGE هنوز منتشر نشده (CI در حال build؟) — تلاش $i/10..."
    sleep 30
done
if [[ "$IMAGE_READY" != "1" ]]; then
    info "❌ بعد از ۵ دقیقه تصویر $SHA_IMAGE منتشر نشد — نسخهٔ قبلی همچنان سرویس می‌دهد."
    exit 1
fi

# FIX v4 (2026-08-23): `docker compose images` ایمیج کانتینِر در حال اجرا را
# می‌دهد نه آخرین تگ پول‌شده — برای مقایسهٔ «آیا pull چیزی تازه آورد؟» باید ID
# خودِ تگ :main قبل/بعد از pull سنجیده شود (docker image inspect .Id).

IMG_BEFORE=$(docker image inspect -f '{{.Id}}' "$IMG_REF" 2>/dev/null || true)

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

IMG_AFTER_PULL=$(docker image inspect -f '{{.Id}}' "$IMG_REF" 2>/dev/null || true)

if [[ "$GIT_CHANGED" == "0" && "$IMG_BEFORE" == "$IMG_AFTER_PULL" ]]; then
    info "⏳ تصویر :main تغییری نکرده و کامیت جدیدی هم نیست — بدون sentinel خارج می‌شوم..."
    exit 1
fi

# بالا آوردن کانتینرها (فقط در صورت تغییر تصویر recreate می‌شوند)
docker compose --env-file "$REPO_DIR/.env" \
    -f "$REPO_DIR/deploy/docker-compose.azure.yml" up -d

# FIX v4: تأیید نهایی — کانتینر web باید واقعاً روی ID تگ :main اجرا شود.
# اگر up -d به هر دلیلی recreate نکرده بود، بدون sentinel خارج شو تا تلاش مجدد.
IMG_TAG_ID=$(docker image inspect -f '{{.Id}}' "$IMG_REF" 2>/dev/null || true)
IMG_RUNNING=$(docker inspect deploy-web-1 --format '{{.Image}}' 2>/dev/null || true)

if [[ -z "$IMG_TAG_ID" || "$IMG_RUNNING" != "$IMG_TAG_ID" ]]; then
    info "⚠️ کانتینر web روی ایمیج تگ :main نیست (recreate نشد؟) — بدون sentinel خارج می‌شوم تا دقیقهٔ بعد دوباره..."
    exit 1
fi

# تصاویر قدیمی را پاک کن (دیسک 32GB)
docker image prune -f >/dev/null 2>&1 || true

info "✅ آپدیت کامل شد — $(git rev-parse --short HEAD)"
