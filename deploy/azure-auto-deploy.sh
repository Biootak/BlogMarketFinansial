#!/usr/bin/env bash
# ============================================================================
# Cron-poll auto-deploy — از cron روی VM هر دقیقه صدا زده می‌شود.
# ----------------------------------------------------------------------------
# اگر commit جدیدی روی `origin/main` (GitHub) باشد → deploy/azure-update.sh را
# اجرا می‌کند تا سایت آپدیت شود. اگر تغییری نباشد → بی‌صدا خارج می‌شود.
#
# چرا cron-poll (به‌جای webhook/GitHub Actions)؟
#   - صفر secret در GitHub؛ رپو پابلیک است و VM فقط بیرون‌کِش می‌کشد.
#   - نیازی به پورت ورودی جدید نیست (NSG فقط 22/80/443) — webhook لازم ندارد.
#
# 2026-08-16: تصویرها در CI (ghcr.io) ساخته می‌شوند نه روی VM. اگر pull
# شکست بخورد (CI هنوز build تمام نکرده) آپدیت ناموفق است → نشانگر
# .azure-last-deployed نوشته نمی‌شود → دقیقهٔ بعد دوباره تلاش می‌شود تا
# تصویر ظاهر شود و کانتینرها آپدیت شوند.
#
# نصب (یک‌بار، روی VM):
#   sudo bash deploy/install-auto-deploy.sh
# ============================================================================
set -euo pipefail

REPO_DIR="${AZURE_REPO_DIR:-$HOME/fm-blog}"
BRANCH="${AZURE_DEPLOY_BRANCH:-main}"
LOCK="/tmp/fm-blog-azure-deploy.lock"
LAST_FILE="$REPO_DIR/.azure-last-deployed"
LOG="${AZURE_DEPLOY_LOG:-/var/log/fm-blog-azure-deploy.log}"

[[ -d "$REPO_DIR/.git" ]] || exit 0

cd "$REPO_DIR"

# آخرین وضعیت GitHub — اگر fetch نشد (قطع اینترنت و…) بی‌صدا رد شو
git fetch origin "$BRANCH" >/dev/null 2>&1 || exit 0

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "$LOCAL")"
LAST_DEPLOYED="$(cat "$LAST_FILE" 2>/dev/null || echo "")"

# commit جدیدی نیست و آخرین deploy موفق بوده → کاری نکن
if [[ "$LOCAL" = "$REMOTE" ]] && [[ "$LOCAL" = "$LAST_DEPLOYED" ]]; then
    exit 0
fi

# قفل — اگر دیپلوی دیگری (مثلاً دستی) در جریان است، این دور را رد کن
if ! mkdir "$LOCK" 2>/dev/null; then
    exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

# commit جدید یا deploy قبلی ناقص → دیپلوی استاندارد
if bash "$REPO_DIR/deploy/azure-update.sh"; then
    # 2026-08-16: HEAD را بعد از pull بنویس (LOCAL قبل از pull گرفته شده بود —
    # باگ: marker قدیمی می‌ماند و هر دقیقه deploy بی‌فایده دوباره اجرا می‌شد).
    echo "$(git rev-parse HEAD)" > "$LAST_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ آپدیت ناموفق — دقیقهٔ بعد دوباره تلاش می‌شود" >> "$LOG"
    exit 1
fi
