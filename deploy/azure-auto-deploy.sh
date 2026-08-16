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
#   - در آفر دانشجویی Azure، ghcr/ACR بلاک است → build حتماً باید روی VM
#     انجام شود؛ این روش همان build لوکال است، فقط خودکار شده.
#
# نصب (یک‌بار، روی VM):
#   sudo bash deploy/install-auto-deploy.sh
# ============================================================================
set -euo pipefail

REPO_DIR="${AZURE_REPO_DIR:-$HOME/fm-blog}"
BRANCH="${AZURE_DEPLOY_BRANCH:-main}"
LOCK="/tmp/fm-blog-azure-deploy.lock"

[[ -d "$REPO_DIR/.git" ]] || exit 0

cd "$REPO_DIR"

# آخرین وضعیت GitHub — اگر fetch نشد (قطع اینترنت و…) بی‌صدا رد شو
git fetch origin "$BRANCH" >/dev/null 2>&1 || exit 0

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "$LOCAL")"

# تغییری نیست → کاری نکن
[[ "$LOCAL" = "$REMOTE" ]] && exit 0

# قفل — اگر دیپلوی دیگری (مثلاً دستی) در جریان است، این دور را رد کن
if ! mkdir "$LOCK" 2>/dev/null; then
    exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

# commit جدید هست → دیپلوی استاندارد
exec bash "$REPO_DIR/deploy/azure-update.sh"
