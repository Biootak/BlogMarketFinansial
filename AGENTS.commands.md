# AGENTS.commands.md — npm & dev commands

Load when running scripts, migrations, or builds.

## npm scripts

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # next dev (Turbopack) via scripts/dev-turbo.mjs — auto-restarts when
                       #   Turbopack FATAL-panics reading the locked `.freebuff/desktop-v2.db-shm`
                       #   (Freebuff desktop's SQLite file; no watch-ignore option in Next 16.3)
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