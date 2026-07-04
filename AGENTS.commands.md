# AGENTS.commands.md — npm & dev commands

Load when running scripts, migrations, or builds.

## npm scripts

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # next dev (Turbopack — fast dev)
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

Postgres is provided by `docker-compose.yml` (`registry.docker.ir/library/postgres:15-alpine`); otherwise set `DATABASE_URL` to a local instance. There is **no test framework** (`jest`/`vitest`/`playwright` not installed) and **no CI** (no `.github/workflows`).