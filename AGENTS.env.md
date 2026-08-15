# AGENTS.env.md — Environment variables

Load when adding/changing config or debugging env. `.env.example` is the source of truth.

## Required

`DATABASE_URL`, `AUTH_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`), `NEXTAUTH_URL`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`, `EMAIL_PROVIDER` (resend|smtp|console; default resend), `RESEND_API_KEY`+`RESEND_FROM`, SMTP_* (when EMAIL_PROVIDER=smtp), storage S3-compatible: `S3_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET_NAME` (+ optional `S3_REGION`, `S3_PUBLIC_URL`, `S3_BACKUP_BUCKET`), `TELEGRAM_BOT_TOKEN/ADMIN_CHAT_ID`, `NEXT_PUBLIC_SENTRY_DSN/SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_SETUP_IPS`, `DEBUG_MODE`, `USDT_PREMIUM_PERCENT`, `CRON_SECRET` (for `/api/cron/sync-bazaar`; random 32+ chars). `TGJU_SCRAPER_ENABLED` (default `true`; set `false` to disable the TGJU scraper without redeploying).

## SMS / Phone Verification (phone-verify.ts)

`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — required in production for `sendPhoneOtp`. If any is missing, `src/lib/sms.ts` falls back to **console.log** mode (dev/staging only; no real SMS is sent). Set all three in Heroku config vars for the `phone-verify` server actions to function in prod.

## Notes

`NEXT_PUBLIC_SENTRY_DSN` + `NODE_ENV=production` triggers Sentry wrapping in `next.config.ts` — leaving it unset in dev avoids an extra middleware hop.