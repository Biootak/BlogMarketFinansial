# TERAX.md

## Project

BlogMarketFinansial is a full-stack Persian (fa-IR, RTL) financial markets blog and content platform. The stack is **Next.js 16** (App Router + Turbopack) on **React 19**, **Prisma 6** over **PostgreSQL**, **NextAuth v5** (JWT sessions, 3-day max age), and a **Tailwind CSS 4** + Radix UI design system inspired by Linear/Vercel/Stripe. Storage is S3-compatible (Liara) with a local fallback under `public/uploads`. External integrations include Sentry, Upstash Redis (rate limiting, with in-memory fallback), Resend (email), Exir API (crypto/FX ticker), Telegram bot, and Tiptap (rich editor). UI copy and error messages are Persian-first.

## Commands

```bash
npm install              # runs `prisma generate` via postinstall
npm run dev              # next dev --turbopack → http://localhost:3000
npm run build            # next build
npm start                # production server
npm run lint             # Next.js default ESLint (Biome exists but is not wired to npm scripts)

npx prisma migrate dev   # apply migrations
npx prisma generate      # regenerate client
npx prisma studio        # DB GUI
npx tsx scripts/seed-categories.ts   # seed default categories (idempotent)
npx tsx scripts/seed-posts-and-ads.ts

docker-compose up -d     # local web + Postgres stack
```

No test runner is configured — validate with `lint`, `build`, and manual `dev` checks. Deep reference: `CLAUDE.md`.

## Architecture

### App router (`src/app/`)

| Path | Purpose |
|---|---|
| `layout.tsx` | Root layout: `<html dir="rtl" lang="fa-IR">`, Vazirmatn font, next-themes, default SEO/OG metadata, Toaster. |
| `(site)/` | Public marketing & reading site. Route groups: `(home)`, `(archives)/archive/[[...slug]]`, `(singles)/...` (subgroups `default` and `has-sidebar` for standard/video/gallery/audio/3-column posts), `(others)`, plus top-level `about`, `author`, `contact`, `money-transfer`, `online-payment`, `terms`, signin/signup pages. |
| `dashboard/` | Admin/author area. `layout.tsx` enforces `checkRole(['SUPER_ADMIN','ADMIN','AUTHOR'])` server-side, wraps content in `SiteSettingsProvider` + Sidebar/Header. Subpages: users, posts, categories, exchange-rates, rate-lists, advertisements, credit-rates, billing, subscription, service-requests, settings, reports, edit-profile. |
| `setup/` | First-run super-admin bootstrap. Allowed only when no super-admin exists; IP-restricted in production via `ALLOWED_SETUP_IPS`. |
| `api/` | REST routes. **No** `/api/posts` or `/api/users` — those are server actions. Real endpoints: `auth/[...nextauth]`, `categories`, `tags`, `pageview` (IP rate-limited POST), `upload` + `upload/delete` (auth, magic-byte validated, sharp→WebP, S3+local), `uploads/[...path]` (S3 with local fallback, 1y cache), `revalidate` (admin-only path allowlist), `settings`, `system-logs`, `system-reports`, `system-status`, `activity-log`, `traffic-stats` (mocked), `debug-session`. |

### Data flow

Server components fetch on the server with `unstable_cache(..., { revalidate, tags })` using explicit tags (`posts`, `gallery-posts`, `latest-posts`, `featured-posts`, `categories`, `system-settings`, `advertisements`). The data is passed to client components as `initial*` props. Mutations live in `src/actions/*` (marked `'use server'`) and call `revalidateTag(...)` via `src/actions/revalidateActions.ts`. The `/api/revalidate` HTTP route is the admin-triggered equivalent.

### Key directories

- `src/actions/` — `'use server'` server actions (post, user, category, settings, ticker, revalidate, createSuperAdmin, fetchExchangeRates). Pattern: Zod parse → `checkRole`/`auth` → mutate → `revalidatePath`/`revalidateTag` → `ActionResult<T>`.
- `src/data/` — server-only accessors (`user.ts`, `navigation.ts`, `getSystemSettings.ts` uses `unstable_cache`).
- `src/lib/` — `db.ts` (Prisma singleton on `globalThis.prismaGlobal`), `auth.ts` (role guards), `motion.ts` (the single source of truth for animations: `STRIPE_EASE`, `LINEAR_SPRING`, `staggerContainer`, `reducedMotionSafe`), `storage.ts` (S3+local), `exchange-rates.ts` (Exir v2 with mock fallback, 60s revalidate), `error-handler.ts` (`AppError`, `safeAction`, `logError`→Sentry), `safe-fetch.ts` (Prisma error code → Persian message), `rate-limiter.ts` (Upstash or in-memory).
- `src/schemas/` — Zod schemas, Persian error messages inline.
- `src/types/types.ts` — single barrel. Base shapes via `Prisma.validator<...>()`, re-exports Zod-inferred types, `ActionResult<T>`.
- `src/components/` — `ui/` (shadcn-style on Radix), `Header/`, `Navigation/` (desktop `layoutId` shared pill, mobile dialog/accordion), `PostsDisplay.tsx/` (`PostsList`/`PostItem`/`FeaturedPostHero`/`CompactPostCard`/`AdItem`), `Sections/` (tabbed `ClientSidePosts` + page sections), `Dashboard/`, `Editor1/` (Tiptap), `ModernTrending/`, `PopularTopics/`, `LatestPostsFeed/`, `Skeletons/`, `CommandPalette/`, `ImageUpload/`, `shared/`, `providers.tsx` (next-themes + no-flash inline script).
- `src/styles/index.scss` + `src/app/globals.css` — Tailwind v4 tokens declared in `@theme {}` blocks (no `tailwind.config.ts`).

### Auth

- `src/auth.config.ts` — provider list (Google, GitHub) + signin/signup page config; Edge-safe.
- `src/auth.ts` — full NextAuth with `PrismaAdapter`, Credentials provider (bcrypt + Zod `LoginSchema`), JWT session (3 days), role/email/name embedded in JWT.
- `src/auth.edge.ts` — Edge-safe `auth()` used by `middleware.ts`.
- `middleware.ts` — protects `/dashboard/*` and most of `/api/*`. Excludes `apiAuthPrefix`, `/api/public/*`, `/api/auth/*`, `/api/uploads`, `/api/pageview`. Reads cookie `__Secure-authjs.session-token` in prod, `authjs.session-token` in dev. Also re-checks `token.exp` and is the matcher for `/uploads/*` → `/api/uploads/*` (rewrite in `next.config.ts`).
- Route lists come from `src/config/routes.ts`: `baseDashboardRoutes`, `authorRoutes`, `adminRoutes`, `superAdminRoutes`, `publicRoutes`, `authRoutes`, `apiAuthPrefix`.
- Server guards in `src/lib/auth.ts`: `checkRole`, `checkSuperAdmin`, `checkAdmin`, `checkAuthor`, `checkExistingSuperAdmin` — all redirect on failure.

## Entry points

| What | Path |
|---|---|
| App root layout | `src/app/layout.tsx` |
| Home (`/`) | `src/app/(site)/(home)/page.tsx` |
| Hero slider | `src/app/(site)/(home)/SectionLargeSlider.tsx` |
| Latest posts section | `src/components/Sections/SectionMagazine1.tsx` → `ClientSidePosts.tsx` → `PostGrid.tsx` → `PostsDisplay.tsx/PostsList.tsx` |
| Archive | `src/app/(site)/(archives)/archive/[[...slug]]/page.tsx` |
| Single post | `src/app/(site)/(singles)/...` |
| Dashboard shell | `src/app/dashboard/layout.tsx` |
| Super-admin setup | `src/app/setup/page.tsx` |
| API auth | `src/app/api/auth/[...nextauth]/route.ts` |
| Upload pipeline | `src/app/api/upload/route.ts` + `src/app/api/upload/delete/route.ts` + `src/app/api/uploads/[...path]/route.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Middleware | `middleware.ts` |
| Next config + CSP + Sentry | `next.config.ts` |
| Sentry init | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Env source of truth | `.env.example` |

## Conventions

- **Server actions** are the mutation path; reserve `app/api/*` for genuine HTTP surfaces (file serving, webhooks, NextAuth).
- Every action returns `ActionResult<T>` from `src/types/types.ts`; use `safeAction()` from `src/lib/error-handler.ts` to wrap throwers.
- Cache invalidation: tag-based. Add your tag to `unstable_cache` calls, then call `revalidateTag(...)` from the matching action. New tags also belong in `revalidateActions.ts`.
- All UI copy and error messages are **Persian**. Use `toPersianNumber` / `formatNumber` from `src/utils/` for digits; dates use `date-fns` + `date-fns-jalali` via `formatDate`.
- Theme is **dark-first** (see `TODO.md`); tokens are CSS variables in `globals.css` (`--c-surface-canvas`, `--c-foreground`, etc.). Use them instead of hardcoded colors.
- Motion timings live **only** in `src/lib/motion.ts`. Don't hand-roll easings in components.
- Component paths: `src/components/<Area>/<Name>.tsx` (PascalCase, folder per area). Post-display components live in `src/components/PostsDisplay.tsx/` (note the `.tsx` in the folder name).
- Path alias: `@/*` → `src/*` (see `tsconfig.json`).
- `output: 'standalone'` in `next.config.ts` — Docker build expects `server.js` from `.next/standalone`.

## Gotchas

- `src/app/api/data/routs.ts` has a **typo** in the filename (`routs`, not `routes`). Don't "fix" without updating the importer.
- `next.config.ts` has `transpilePackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'framer-motion']` — add new ESM-only packages there if bundling fails.
- `postcss.config.mjs` uses `@tailwindcss/postcss` (Tailwind v4). There is **no** `tailwind.config.ts` — all tokens are CSS variables in `globals.css`.
- `middleware.ts` matcher excludes `/api/pageview`, `/api/public/*`, `/api/auth/*`, `/api/uploads/*`, `/uploads/*`, `/_next/*`, and dotfiles. Public marketing pages skip JWT decode entirely (intentional perf win).
- `react-hooks-global-state` triggers a harmless React 19 peer-dep warning during `npm install`.
- `docker-compose.yml` has a hard-coded Postgres password and the `Dockerfile` uses Iranian npm/prisma/sharp mirrors + `PRISMA_ENGINES_MIRROR` overrides — strip them for non-Iranian builds.
- Cookie name in production is `__Secure-authjs.session-token`. If sessions appear missing in prod, verify `NEXTAUTH_URL`/`AUTH_TRUST_HOST` and the `Secure` cookie flag.
- Sentry is **only** wrapped in `next.config.ts` when `NEXT_PUBLIC_SENTRY_DSN` is set **and** `NODE_ENV=production`. Tunnel route is `/monitoring`.
- CSP in `next.config.ts` is **enabled** (per the 2026-06-14 comment) — dev allows `'unsafe-eval'` for HMR, prod does not. The theme bootstrap script in `providers.tsx` and Sentry loader are allowlisted.
- `experimental.ppr: 'incremental'`, `experimental.staleTimes`, `optimizePackageImports: ['lucide-react', 'react-icons', 'framer-motion']`, and `httpAgentOptions.keepAlive: true` are tuned in `next.config.ts` — leave them alone unless you understand the implications.
- Many API paths referenced in `middleware.ts` (e.g. `/api/posts`, `/api/users`) are **not** actual route files. The middleware is forward-looking; rely on `authRoutes`/`publicRoutes` + allowlists. Add real routes under `src/app/api/<name>/route.ts` only if you need a JSON surface.
- `Biome` (`biome.json`) is configured but not wired to npm scripts. Run it directly if you want import sorting / lint beyond ESLint defaults.
- `Editor1/` (Tiptap) uses the same `postActions` shape as the server action — keep them in sync when changing the post schema.
