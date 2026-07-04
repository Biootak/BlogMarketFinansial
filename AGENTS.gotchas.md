# AGENTS.gotchas.md — easy-to-miss behaviors

Load when something weird happens or you're about to touch these subsystems.

## `revalidateTag`

- **Must come from `@/lib/revalidate`**, not `next/cache`. Next 16's typed signature requires a second `profile` argument; the wrapper always passes `'max'`. See `src/lib/revalidate.ts`.
- **Only invalidates `unstable_cache` from a Server Action.** Seed scripts that write to the DB directly do **not** bust the data cache — call the relevant action or `revalidatePath` afterwards.

## Prisma

- **Singleton** in `src/lib/db.ts`. Don't `new PrismaClient()` in app code. Exception: `src/actions/createSuperAdmin.ts`.

## Auth

- **Cookie name** flips with env: `__Secure-authjs.session-token` in prod, `authjs.session-token` in dev. Middleware handles this.
- **Middleware matcher is intentionally narrow**: `/dashboard/:path*`, `/api/((?!pageview|public|auth|uploads).*)`, auth pages. Don't widen without reading perf comment at `middleware.ts:213`.

## Next config

- **CSP and `images.remotePatterns` are allowlists** in `next.config.ts`. Any new external domain (scripts, frames, image hosts) must be added there or request is blocked in production.

## Uploads

- Dev writes to `public/uploads/{folder}/` (served by `rewrites()` → `/api/uploads/[...path]`); production is S3-only via `src/lib/storage.ts`.
- `/api/upload` requires auth, re-validates magic bytes, sanitizes SVG (`src/app/api/upload/route.ts`). Folders restricted to `posts | avatars | categories | tags | ads | general`.

## Rate limits

`src/lib/rate-limiter.ts` with Upstash + LRU in-memory fallback:
- `api` 100/min
- `upload` 30/min
- `auth` 10/15min
- `pageview` 200/min

If Upstash is unset or fails, requests still succeed via in-memory path.

## Build vs dev (since 2026-06-27)

- `next dev` uses Turbopack — PostCSS uses `lightningcss@1.30.2` from npm, no panic.
- `next build` with Turbopack still panics (embedded `lightningcss` alpha.70 in next@16.2.9). So `build` runs with `--webpack` until Turbopack bundles stable lightningcss.
- To test Turbopack build: `npx next build` (no flag) — will crash on `globals.css`.

## Dashboard 2026 v2 CSS

Large (~660 lines), lives at the tail of `globals.css`. If `dash-bento2`, `dash-pane--hero/--compact/--tall`, `dash-toolbar`, `dash-hero*`, `dash-minical`, etc. render unstyled, search file for `Dashboard 2026 (June 22)` — that's the only marker. The block must be wrapped in its own `@layer utilities`.

## Disposing dev servers (Windows)

`npx next dev` keeps a `next-server` child even after parent shell exits. Use `Get-NetTCPConnection -LocalPort <port> | Stop-Process -Id $_.OwningProcess -Force`; bare `Stop-Job` leaves the port bound.

## Setup bootstrap

Visit `/setup` once after migrations to create initial `SUPER_ADMIN`. In production the server action enforces `ALLOWED_SETUP_IPS`. After a SUPER_ADMIN exists the action refuses to create another.

## Bazaar rates sync (TGJU scraping)

`/api/cron/sync-bazaar` scrapes `tgju.org` (ArvanCloud-fronted, realistic browser UA, 12s timeout) and upserts 19 currencies into `ExchangeRate` rows. Auth: `CRON_SECRET` (Bearer header or `?secret=` query). Schedule every 10 min. On scrape failure returns `502`; DB stays untouched. Disable with `TGJU_SCRAPER_ENABLED=false`.

## Debug middleware

Set `DEBUG_MODE=true`; logs to `console.log` for `/dashboard/*` requests.