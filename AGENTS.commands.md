# AGENTS.commands.md — npm & dev commands

Load when running scripts, migrations, or builds.

## npm scripts

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # next dev (Turbopack) via scripts/dev-turbo.mjs — auto-restarts when
                       #   Turbopack FATAL-panics reading the locked `.freebuff/desktop-v2.db-shm`
                       #   (Freebuff desktop's SQLite file; no watch-ignore option in Next 16.3)
npm run cache:clean    # scripts/clear-dev-cache.mjs — deletes .next/cache + turbopack dev cache
                       #   + compiled CSS. Kills the running next-server (dev-turbo restarts it).
                       #   ⚠️ ALWAYS run this after changing CSS tokens (--fs-base, --ds-*): the
                       #   persistent Turbopack cache can serve STALE compiled styles after a
                       #   plain restart, silently regressing the site. Then hard-refresh the
                       #   browser (Ctrl+Shift+R).
npm run dev:clean      # cache:clean + npm run dev — use when NO dev server is running
                       #   (if one is running, cache:clean's auto-restart already covers it)
npm run dev:raw        # plain next dev (Turbopack), no auto-restart (for debugging panics)
npm run dev:webpack    # next dev --webpack fallback (slower; watcher ignores .freebuff)
npm run build          # next build --webpack (Turbopack build panics on embedded lightningcss alpha)
npm run lint           # next lint   (ESLint)
npx tsc --noEmit       # no typecheck script in package.json — use this
npm run db:seed        # node prisma/seed.js — idempotent, dev only
npm run db:reset       # scripts/reset-and-seed-50-posts.js
npm run db:fresh       # prisma migrate reset --force && npm run db:seed
npm run db:stats       # scripts/db-stats.js
npx prisma migrate dev # schema changes

## Rules Read Gate (مکانیکی — قبل از هر کد)

```bash
npm run rules:check    # گام صفر هر تسک — بدون مهر تازه FAIL می‌دهد + لیست فایل‌ها
npm run rules:stamp -- --files "AGENTS.md,PDK.md,pdk/constitution.md"
                       # بعد از خواندن واقعی فایل‌ها — مهر sha256 ثبت می‌کند
npm run rules:log      # audit trail مهرها (کی/چه کسی چه فایل‌هایی را خوانده)
npm run rules:watch    # watcher زنده — همان لحظهٔ اولین ویرایش فایل کد با مهر کهنه هشدار می‌دهد
                       #   (داخل npm run dev هم خودکار فعال است؛ log: .rules-violations.log)
npm run setup:hooks    # git config core.hooksPath scripts/git-hooks (clone تازه)
```

- `npm run verify` = `rules:check` + typecheck + lint + tests → بدون مهر تازه سبز نمی‌شود.
- pre-commit hook کامیت بدون مهر تازه را بلاک می‌کند (دور زدن عمدی: `--no-verify`).
- تغییر AGENTS.md/PDK.md/pdk/constitution.md → مهر خودکار باطل (hash). TTL: `RULES_GATE_TTL_MINUTES` (پیش‌فرض ۱۲۰).
- `CI=true` یا `RULES_GATE_SKIP=1` → gate غیرفعال (فقط برای CI/استثنا).
npx prisma studio      # DB GUI
```

Postgres is provided by `docker-compose.yml` (`registry.docker.ir/library/postgres:15-alpine`); otherwise set `DATABASE_URL` to a local instance.

## Tests & CI

- Tests: `npm test` (vitest) — unit tests in `src/lib/*.test.ts`.
- CI exists in `.github/workflows/`: `dependency-safety.yml` و چند وورک‌فلو legacy (ر.ک زیر).
- **Deploy به Azure (روش فعلی و استاندارد — فقط همین را استفاده کن):** آپدیت سایت فقط با
  **push به `main`** انجام می‌شود. GitHub Actions (`.github/workflows/docker-build-push.yml`)
  تصویرهای web+cron را روی runner قوی build و به `ghcr.io/biootak/fm-blog-{web,cron}:main`
  push می‌کند. روی Azure VM یک cron-poll هر دقیقه `origin/main` را fetch می‌کند و در صورت
  commit جدید `deploy/azure-update.sh` را اجرا می‌کند (pull → compose pull → up -d → prune).
  **build روی VM انجام نمی‌شود** (B2ats_v2 1GB رم نمی‌تواند next build را در زمان معقول
  بسازد — OOM/throttle). هیچ secret/دستور دستی لازم نیست.
  مرجع واحد و سند کامل: **`deploy/AZURE.md` §دیپلوی روزمره**. اسکریپت‌ها:
  `deploy/azure-update.sh` (دیپلوی استاندارد)، `deploy/azure-auto-deploy.sh` (poll)،
  `deploy/install-auto-deploy.sh` (نصب یک‌بار cron روی VM).
  عیب‌یابی: لاگ دیپلوی خودکار = `sudo tail -f /var/log/fm-blog-azure-deploy.log` روی VM؛
  وضعیت کانتینرها = `docker compose --env-file .env -f deploy/docker-compose.azure.yml ps`
  روی VM. رول‌بک = push یک commit بازگشتی (CI دوباره می‌سازد) یا `git reset --hard` روی VM
  + `bash deploy/azure-update.sh`.
- **Heroku منسوخ شد** (مهاجرت به Azure در جریان — سند قدیمی: `deploy/HEROKU.md`).
  `deploy-heroku.yml` دیگر نباید استفاده شود؛ بعد از کامل‌شدن cutover حذف می‌شود.
- Cron ها (نرخ بازار، پست‌های زمان‌بندی‌شده، backup) حالا داخل کانتینر cron کنار اپ روی
  Azure VM اجرا می‌شوند (`deploy/docker-compose.azure.yml` سرویس `cron`).

## Error/status pages — canonical architecture (must-follow)

هر چیزی که «ارور/وضعیت» نشان می‌دهد باید از همین سه primitive استفاده کند — نسخهٔ اختصاصی نساز:

| موقعیت | کامپوننت | توضیح |
|---|---|---|
| خطای runtime در route (boundary) | `RouteError` (`@/components/Dashboard/primitives`) | پراپ `section` بده؛ همیشه `Sentry.captureException` دارد؛ در prod متن خطا را نشان نمی‌دهد. `variant="inline"` برای داخل layout ها |
| 404 | `NotFound` | برای `not-found.tsx`؛ `primaryLink`/`secondaryLinks`/`tone`/`variant` دارد |
| صفحهٔ وضعیت کامل (maintenance/offline/session-expired/exchange-suspended/forbidden) | `StateHero` | پراپ‌های `code`/`mark`/`meta`/`helpItems`/`foot` |
| root crash (layout مرده) | `global-error.tsx` | فقط inline — چون providers بالای آن نیستند، به StateHero/RouteError دست نزند |

قوانین سخت:
1. `error.tsx` جدید → فقط `RouteError` با `section` فارسی. استثناهای عمدی (با کامنت دلیل): `(auth)/error.tsx` (داخل کارت auth) و `dashboard/observability/error.tsx` (متن خام برای ادمین).
2. بدون emoji، بدون hex/rgb hardcode — فقط توکن‌های design system؛ RTL با logical props؛ `prefers-reduced-motion`؛ aria/role درست.
3. کامنت/تبلیغ طراحی باید با کد واقعی یکی باشد — اگر کامنت می‌گوید «suggestion cards» باید در JSX پیاده شده باشند (قبلاً این قول نقض شده بود).
4. اگر primitive کمبود دارد، همان primitive + CSS اش را گسترش بده؛ صفحهٔ جدید با استایل جدید نساز.
5. تست: بعد از هر تغییر `npx tsc --noEmit` و `npm test`.