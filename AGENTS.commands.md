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
npx prisma studio      # DB GUI
```

Postgres is provided by `docker-compose.yml` (`registry.docker.ir/library/postgres:15-alpine`); otherwise set `DATABASE_URL` to a local instance.

## Tests & CI

- Tests: `npm test` (vitest) — unit tests in `src/lib/*.test.ts`.
- CI exists in `.github/workflows/`: `deploy-heroku.yml` (deploy به Heroku) و `dependency-safety.yml`.
- **Deploy به Heroku فقط از یک روش:** push به `main` (Container stack + GitHub Actions).
  سند کامل و مرجع واحد: `deploy/HEROKU.md`. از buildpack استفاده نکن.
- Cron ها (نرخ بازار، پست‌های زمان‌بندی‌شده، backup) + keep-alive روی **cron-job.org** هستند
  (`.github/workflows/cron.yml` حذف شد). جزئیات در `deploy/HEROKU.md` مرحله ۵.

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