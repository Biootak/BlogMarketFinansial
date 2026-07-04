# AGENTS.env.md — Environment variables

Load when adding/changing config or debugging env. `.env.example` is the source of truth.

## Required

`DATABASE_URL`, `AUTH_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`), `NEXTAUTH_URL`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`, `EMAIL_PROVIDER` (resend|smtp|console; default resend), `RESEND_API_KEY`+`RESEND_FROM`, SMTP_* (when EMAIL_PROVIDER=smtp), `LIARA_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET_NAME`, `TELEGRAM_BOT_TOKEN/ADMIN_CHAT_ID`, `NEXT_PUBLIC_SENTRY_DSN/SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_SETUP_IPS`, `DEBUG_MODE`, `USDT_PREMIUM_PERCENT`, `CRON_SECRET` (for `/api/cron/sync-bazaar`; random 32+ chars). `TGJU_SCRAPER_ENABLED` (default `true`; set `false` to disable the TGJU scraper without redeploying).

## Notes

`NEXT_PUBLIC_SENTRY_DSN` + `NODE_ENV=production` triggers Sentry wrapping in `next.config.ts` — leaving it unset in dev avoids an extra middleware hop.