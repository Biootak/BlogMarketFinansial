#!/usr/bin/env bash
# ============================================================================
# Rollback — برگشت به نسخهٔ قبلی (تگ immutable sha-<short> از CI).
# ----------------------------------------------------------------------------
# دیپلوی روزمره فقط :main را بالا می‌آورد؛ CI برای هر کامیت یک تگ تغییرناپذیر
# sha-<short> هم می‌زند تا تصویر قبلی همیشه قابل ارجاع باشد (docker image prune
# تصویرِ tagged را حذف نمی‌کند).
#
# استفاده (روی VM):
#   bash deploy/rollback.sh <commit-sha>     # sha کامل یا کوتاه
#
# چه می‌کند:
#   1) تصویر sha-<short> را از ghcr pull می‌کند (قبل از هر تغییری — اگر تگ نبود،
#      هیچ‌چیز دست‌نخورده می‌ماند).
#   2) سنتینل .azure-rollback می‌سازد → cron-poll (azure-auto-deploy.sh) تا وقتی
#      سنتینل هست بی‌صدا می‌ایستد و رولبک را برنمی‌گرداند.
#   3) کد روی دیسک را با `git reset --hard <sha>` به همان نسخه می‌برد.
#   4) کانتینرها با تصویر قدیمی دوباره بالا می‌آیند (تا recreate، کانتینر فعلی
#      به سرویس ادامه می‌دهد → بدون downtime).
#
# برگشت به آخرین نسخه (آپدیت خودکار دوباره فعال می‌شود):
#   rm ~/fm-blog/.azure-rollback            # cron-poll تا ~۱ دقیقه بعد خودش آپدیت می‌کند
#
# ⚠️ دیتابیس: مایگریشن‌های Prisma دستی اعمال می‌شوند. اگر schema بعد از این
#    کامیت تغییر کرده باشد، رولبک کد بدون برگرداندن دیتابیس ناسازگار می‌شود —
#    فقط وقتی رولبک بزن که نسخهٔ قبلی با schema فعلی سازگار است (یا اول بکاپ
#    restore کن — ر.ک deploy/AZURE.md §بکاپ).
# ============================================================================
set -euo pipefail

REPO_DIR="${AZURE_REPO_DIR:-$HOME/fm-blog}"
BRANCH="${AZURE_DEPLOY_BRANCH:-main}"
LOG="${AZURE_DEPLOY_LOG:-/var/log/fm-blog-azure-deploy.log}"
SENTINEL="$REPO_DIR/.azure-rollback"
LAST_FILE="$REPO_DIR/.azure-last-deployed"
COMPOSE=(docker compose --env-file "$REPO_DIR/.env" -f "$REPO_DIR/deploy/docker-compose.azure.yml")

# ---------- لاگ (اگر /var/log در دسترس نبود → /tmp) ----------
mkdir -p "$(dirname "$LOG")" 2>/dev/null || LOG="/tmp/fm-blog-azure-deploy.log"
touch "$LOG" 2>/dev/null || LOG="/tmp/fm-blog-azure-deploy.log"
info() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

usage() {
    echo "استفاده: bash deploy/rollback.sh <commit-sha>"
    echo "  <commit-sha> — کامیت هدف (کامل یا کوتاه)؛ باید در تاریخچهٔ origin/$BRANCH باشد."
    exit 1
}

[[ $# -eq 1 ]] || usage
TARGET="${1#sha-}"   # هر دو فرم sha-abc1234 و abc1234 را بپذیر

[[ -d "$REPO_DIR/.git" ]] || {
    info "❌ کلون در $REPO_DIR پیدا نشد — AZURE_REPO_DIR را ست کن."
    exit 1
}
cd "$REPO_DIR"

# آخرین وضعیت origin — اگر اینترنت نبود، بدون تغییر خارج شو (رولبک آفلاین نکن)
git fetch origin "$BRANCH" || {
    info "❌ git fetch origin $BRANCH ناموفق بود — رولبک آفلاین انجام نمی‌شود."
    exit 1
}

# حل کردن sha — بعد از fetch تمام تاریخچهٔ origin/main لوکال است
SHA="$(git rev-parse --verify "$TARGET^{commit}" 2>/dev/null)" || {
    info "❌ '$TARGET' یک commit معتبر در تاریخچهٔ origin/$BRANCH نیست."
    exit 1
}

SHORT="${SHA:0:7}"
IMAGE_TAG="sha-$SHORT"

info "── رولبک به $SHA ($SHORT) شروع شد ──"

# ۱) تصویر قدیمی را قبل از هر تغییری pull کن — اگر تگ نبود، چیزی تغییر نمی‌کند
if ! IMAGE_TAG="$IMAGE_TAG" "${COMPOSE[@]}" pull; then
    info "❌ تصویر $IMAGE_TAG در ghcr پیدا نشد. این کامیت احتمالاً قبل از فعال‌شدن"
    info "   تگ‌های sha (فیکس 2026-08-17) ساخته شده — رولبک فقط با digest دستی ممکن است."
    exit 1
fi

# ۲) سنتینل — توقف cron-poll تا کاربر صریحاً آپدیت خودکار را دوباره فعال کند
touch "$SENTINEL"

# ۳) کد روی دیسک → نسخهٔ قدیمی
if [[ "$(git rev-parse HEAD)" != "$SHA" ]]; then
    git reset --hard "$SHA"
fi
echo "$SHA" > "$LAST_FILE"

# ۴) کانتینرها با تصویر قدیمی (بدون downtime — کانتینر فعلی تا recreate سرویس می‌دهد)
if ! IMAGE_TAG="$IMAGE_TAG" "${COMPOSE[@]}" up -d; then
    info "❌ up -d ناموفق بود — کانتینر قبلی همچنان در حال اجراست؛ دوباره همین اسکریپت را اجرا کن."
    exit 1
fi

info "✅ رولبک به $SHA ($SHORT) کامل شد — تصویر $IMAGE_TAG بالا آمد."
info "   سایت را تست کن. برای برگشت به آخرین نسخه (origin/$BRANCH): rm \"$SENTINEL\""
