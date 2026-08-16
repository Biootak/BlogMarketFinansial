#!/usr/bin/env bash
# ============================================================================
# نصب auto-deploy روی Azure VM — یک‌بار اجرا می‌شود.
# ----------------------------------------------------------------------------
# یک خط cron در /etc/cron.d/fm-blog-azure می‌سازد که هر دقیقه
# deploy/azure-auto-deploy.sh را اجرا می‌کند. از آن به بعد:
#   git push (origin/main)  →  ظرف ~۱ دقیقه سایت روی VM آپدیت می‌شود.
#
# استفاده (روی VM):
#   sudo bash deploy/install-auto-deploy.sh
#
# اگر clone در مسیر غیرمعمول است:
#   sudo AZURE_REPO_DIR=/home/ubuntu/fm-blog bash deploy/install-auto-deploy.sh
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "❌ این اسکریپت باید با sudo اجرا بشه." >&2
    exit 1
fi

# ---------- پیدا کردن clone ----------
detect_repo() {
    local dir
    if [[ -n "${AZURE_REPO_DIR:-}" ]]; then
        dir="$AZURE_REPO_DIR"
    elif [[ -d "$HOME/fm-blog/.git" ]]; then
        dir="$HOME/fm-blog"
    elif [[ -d /root/fm-blog/.git ]]; then
        dir=/root/fm-blog
    elif [[ -d /home/ubuntu/fm-blog/.git ]]; then
        dir=/home/ubuntu/fm-blog
    else
        echo "❌ clone پروژه پیدا نشد — AZURE_REPO_DIR را ست کن." >&2
        exit 1
    fi
    [[ -d "$dir/.git" ]] || {
        echo "❌ $dir یک git repo نیست." >&2
        exit 1
    }
    echo "$dir"
}

REPO_DIR="$(detect_repo)"
SCRIPT="$REPO_DIR/deploy/azure-auto-deploy.sh"
LOG="/var/log/fm-blog-azure-deploy.log"
CRON_FILE="/etc/cron.d/fm-blog-azure"
BRANCH="${AZURE_DEPLOY_BRANCH:-main}"

[[ -f "$SCRIPT" ]] || {
    echo "❌ $SCRIPT وجود ندارد." >&2
    exit 1
}

chmod +x "$SCRIPT" "$REPO_DIR/deploy/azure-update.sh"
touch "$LOG"
chmod 644 "$LOG"

cat > "$CRON_FILE" <<EOF
# Auto-deploy از GitHub — push به origin/$BRANCH → سایت روی این VM آپدیت می‌شود
# نصب‌شده توسط deploy/install-auto-deploy.sh — حذف: rm $CRON_FILE
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
AZURE_REPO_DIR=$REPO_DIR
AZURE_DEPLOY_BRANCH=$BRANCH
AZURE_DEPLOY_LOG=$LOG
* * * * * root $SCRIPT >> $LOG 2>&1
EOF

chmod 644 "$CRON_FILE"
systemctl restart cron 2>/dev/null || service cron restart 2>/dev/null || true

echo "✅ Auto-deploy نصب شد:"
echo "   repo : $REPO_DIR"
echo "   cron : $CRON_FILE  (هر دقیقه)"
echo "   log  : $LOG"
echo "   حالا از این به بعد فقط کافی است روی GitHub push کنی."
