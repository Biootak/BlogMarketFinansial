# AGENTS.md

> Persian-first financial blog (`blogmarketfinansial.ir`) on Next.js 16 + Prisma + PostgreSQL + NextAuth v5.
> Before any non-trivial change, read `ARCHITECT_RULES.md` and `.claude/role/SKILL.md` (same content, mirrored).
> User-facing copy is Persian; the user expects Persian in replies, English in code/commands/paths.

## Repo layout

- `src/app/(site)/` — public marketing/blog pages (`(home)`, `(singles)`, `(archives)`, `(others)`).
- `src/app/dashboard/` — role-gated dashboard (`posts`, `categories`, `users`, `settings`, `exchange-rates`, `reports`, …).
- `src/app/api/` — route handlers (`auth/[...nextauth]`, `upload`, `uploads/[...path]`, `public/*`, `pageview`, `reports/*`).
- `src/app/setup/` — bootstrap page that creates the first `SUPER_ADMIN`. **IP-gated in production** by `ALLOWED_SETUP_IPS`.
- `src/actions/*.ts` — every file starts with `'use server';`. Write paths here are the only place that can `revalidateTag`.
- `src/lib/` — `db.ts` (Prisma singleton), `auth.ts`, `rate-limiter.ts` (Upstash Redis + in-memory LRU fallback), `storage.ts` (S3/Liara), `revalidate.ts` (Next-16-safe `revalidateTag` wrapper), `exchange-rates.ts`, `tgju.ts` (scraper client), `freeMarketRates.ts`.
- `src/components/ui/` — shadcn-style primitives. Do not recreate; add new components there.
- `prisma/` — `schema.prisma`, one-time `migrations/20240822064751_biotak/`, `seed.js` (idempotent, covers 22 models).

## Commands

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # next dev --turbopack
npm run build          # next build  (next.config.ts: output: 'standalone')
npm run lint           # next lint   (ESLint; NOT biome — biome.json has no script)
npx tsc --noEmit       # no typecheck script in package.json — use this
npm run db:seed        # node prisma/seed.js — idempotent, dev only
npm run db:reset       # scripts/reset-and-seed-50-posts.js
npm run db:fresh       # prisma migrate reset --force && npm run db:seed
npm run db:stats       # scripts/db-stats.js
npx prisma migrate dev # schema changes
npx prisma studio      # DB GUI
```

Postgres is provided by `docker-compose.yml` (`registry.docker.ir/library/postgres:15-alpine`); otherwise set `DATABASE_URL` to a local instance. There is **no test framework** (`jest`/`vitest`/`playwright` not installed) and **no CI** (no `.github/workflows`).

## Required env (.env.example is the source of truth)

`DATABASE_URL`, `AUTH_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`), `NEXTAUTH_URL`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`, `RESEND_API_KEY`, `LIARA_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET_NAME`, `TELEGRAM_BOT_TOKEN/ADMIN_CHAT_ID`, `NEXT_PUBLIC_SENTRY_DSN/SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN`, `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_SETUP_IPS`, `DEBUG_MODE`, `USDT_PREMIUM_PERCENT`, `CRON_SECRET` (for `/api/cron/sync-bazaar`; random 32+ chars). `TGJU_SCRAPER_ENABLED` (default `true`; set `false` to disable the TGJU scraper without redeploying).

`NEXT_PUBLIC_SENTRY_DSN` + `NODE_ENV=production` is what triggers Sentry wrapping in `next.config.ts` — leaving it unset in dev avoids an extra middleware hop.

## Gotchas that are easy to miss

- **`revalidateTag` must come from `@/lib/revalidate`**, not `next/cache`. Next 16's typed signature requires a second `profile` argument; the wrapper always passes `'max'`. See `src/lib/revalidate.ts`.
- **`revalidateTag` only invalidates `unstable_cache` from a Server Action.** Seed scripts that write to the DB directly do **not** bust the data cache — call the relevant action or `revalidatePath` afterwards.
- **Prisma singleton**: import from `@/lib/db`. Do not `new PrismaClient()` in app code. The exception is `src/actions/createSuperAdmin.ts`, which deliberately instantiates its own client because it runs before the singleton bootstrap.
- **Auth cookie name** flips with env: `__Secure-authjs.session-token` in prod, `authjs.session-token` in dev. The middleware already handles this.
- **Middleware matcher is intentionally narrow**: `/dashboard/:path*`, `/api/((?!pageview|public|auth|uploads).*)`, and the auth pages. Public marketing pages skip JWT decoding entirely. Don't widen it without reading the perf comment at `middleware.ts:213`.
- **CSP and `images.remotePatterns` are allowlists** in `next.config.ts`. Any new external domain (scripts, frames, image hosts) must be added there or the request is blocked in production.
- **Uploads**: dev writes to `public/uploads/{folder}/` (served by `rewrites()` → `/api/uploads/[...path]`); production is S3-only via `src/lib/storage.ts`. `next.config.ts` already sets `Cache-Control: public, max-age=31536000, immutable` for `/uploads/*`.
- **`/api/upload` requires auth** and re-validates magic bytes / sanitizes SVG (`src/app/api/upload/route.ts`). Folders are restricted to `posts | avatars | categories | tags | ads | general`.
- **Rate limits** are in `src/lib/rate-limiter.ts` with both Upstash and an LRU in-memory fallback (`api` 100/min, `upload` 30/min, `auth` 10/15min, `pageview` 200/min). If Upstash is unset or fails, requests still succeed via the in-memory path.
- **Cache tag conventions** used by `unstable_cache` wrappers and `cacheActions.ts`: `posts`, `archive`, `featured-posts`, `latest-posts`, `popular-posts`, `post-{id}`, `post-slug`, `post-by-slug`, `comments`, `categories`, `tags`, `sidebar-data`, `dashboard-stats`, `ticker`, `exchange-rates`, `header-ad`, `advertisements`, `rate-lists`, `dashboard-{section}`. New write paths should invalidate the matching tag(s).
- **Setup bootstrap**: visit `/setup` once after migrations to create the initial `SUPER_ADMIN`. In production the server action enforces `ALLOWED_SETUP_IPS`. After a SUPER_ADMIN exists the action refuses to create another.
- **Debug middleware** by setting `DEBUG_MODE=true`; it logs to `console.log` for `/dashboard/*` requests.
- **Bazaar rates sync (TGJU scraping)**: `/api/cron/sync-bazaar` scrapes `tgju.org` (ArvanCloud-fronted, realistic browser UA, 12s timeout) and upserts 19 currencies into `ExchangeRate` rows. Auth is `CRON_SECRET` (Bearer header or `?secret=` query). Schedule every 10 min via Vercel Cron or external cron. On scrape failure the route returns `502` and DB stays untouched (last successful values remain). Disable temporarily with `TGJU_SCRAPER_ENABLED=false` (falls back to USDT-derived + FX).

## Style / tooling

- TypeScript strict; `noExplicitAny` and `dangerouslySetInnerHTML` are **errors** in Biome, `useHookAtTopLevel` is an error. Biome is the formatter/linter of record but is invoked ad-hoc; CI uses `npm run lint` (ESLint).
- Tailwind v4 (`@tailwindcss/postcss`), Radix UI primitives, Tiptap for the editor, `date-fns` + `date-fns-jalali` for Persian dates.
- RTL is set globally (`html dir="rtl" lang="fa-IR"`). New UI must respect logical properties and not hardcode `left/right`.
- Vazirmatn is loaded via `next/font/google` with subset `arabic` and weights `[400, 500, 600, 700]`.
- Standardized API response shape from actions: `{ success: true, data }` / `{ success: false, error: { code, message } }` — keep it consistent in new actions.

## When in doubt

- The repo already had a code review pass in mid-June 2026 (`2026-06-14`/`2026-06-16` comments throughout the codebase). Skim those before refactoring — they explain non-obvious choices (per-route auth opt-in, hot-path regex precompilation, single-write S3, etc.).
- For architectural rules (DRY, rollback migrations, rate limits, accessibility, performance budgets, change-report format), defer to `ARCHITECT_RULES.md`.