#!/bin/sh
# ============================================================================
# Sidecar cron — حلقه‌ی ساده به‌جای dcron.
# ----------------------------------------------------------------------------
# 2026-08-16: dcron در کانتینر Alpine با «setpgid: Operation not permitted»
# می‌شکند و کانتینر restart-loop می‌شود. این حلقه همان زمان‌بندی
# deploy/crontab.docker را بدون crond اجرا می‌کند:
#   - هر ۶۰ ثانیه: publish-scheduled-posts / refresh-market-rates / telegram-notifications
#   - هر ۱۰ دقیقه: sync-bazaar
# APP_URL و CRON_SECRET از env کانتینر (docker-compose) می‌آیند.
# ============================================================================
log=/var/log/cron.log

run() {
  curl -fsS -m 30 -H "Authorization: Bearer $CRON_SECRET" "$APP_URL$1" >>"$log" 2>&1 || true
}

i=0
while true; do
  run /api/cron/publish-scheduled-posts
  run /api/cron/refresh-market-rates
  run /api/cron/telegram-notifications
  i=$((i + 1))
  if [ $((i % 10)) -eq 0 ]; then
    run /api/cron/sync-bazaar
  fi
  sleep 60
done
