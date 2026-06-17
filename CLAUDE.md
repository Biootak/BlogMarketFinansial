# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Snapshot

BlogMarketFinansial is a full-stack Persian (fa-IR, RTL) financial markets blog/content platform built on Next.js 16 (App Router + Turbopack), React 19, Prisma 6 + PostgreSQL, and NextAuth v5. The UI follows a dark-first Linear × Vercel × Stripe visual language (see `TODO.md`) using Tailwind CSS 4, Radix UI, and shadcn-style primitives. Storage is S3-compatible (Liara) with a local fallback under `public/uploads`. External integrations include Sentry, Upstash Redis (rate limiting), Resend (email), Exir API (crypto ticker), and Tiptap (rich editor).

## Common Commands

All commands run from the repo root.

```bash
# Install (runs `prisma generate` automatically via postinstall)
npm install

# Dev server (Turbopack)
npm run dev                       # http://localhost:3000

# Production
npm run build
npm start

# Lint (Next.js default ESLint)
npm run lint

# Prisma
npx prisma migrate dev            # apply migrations in dev
npx prisma generate               # regenerate client
npx prisma studio                 # GUI

# Seed initial categories (after first migration)
npx tsx scripts/seed-categories.ts
```

Docker stack (web + Postgres) is provided via `docker-compose.yml`; bring it up with `docker-compose up -d` for a one-shot local environment.

There is no test runner configured. Validate changes via `npm run lint`, `npm run build`, and manual `npm run dev` checks.

## Environment

`.env.example` is the source of truth. Key variables:

- `DATABASE_URL` — PostgreSQL connection.
- `AUTH_SECRET` / `NEXTAUTH_URL` — NextAuth v5.
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — OAuth providers.
- `RESEND_API_KEY` — outgoing email.
- `LIARA_ENDPOINT` / `LIARA_ACCESS_KEY` / `LIARA_SECRET_KEY` / `LIARA_BUCKET_NAME` — S3 storage.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID`.
- `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — Sentry is only wrapped in `next.config.ts` when the DSN is set.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — rate limiting. When unset, `src/lib/rate-limiter.ts` falls back to an in-memory limiter.
- `NEXT_PUBLIC_SITE_URL` — used for canonical/OG metadata in `src/app/layout.tsx`.
- `ALLOWED_SETUP_IPS` — comma-separated IPs allowed to hit `/setup` in production.
- `DEBUG_MODE=true` — enables verbose middleware logging (see `middleware.ts`).

## High-Level Architecture

### App router layout

- `src/app/layout.tsx` — root layout, font loading (Vazirmatn), `next-themes` provider, default SEO/OG/Twitter metadata, viewport theme colors, `<html dir="rtl" lang="fa-IR">`.
- `src/app/(site)/` — public marketing & reading site. Route groups organize archives (`(archives)/archive/[[...slug]]`), home (`(home)/page.tsx`), singles (`(singles)/...` with `(default)` and `(has-sidebar)` subroutes for standard/video/gallery/audio/3-column posts), and others (about, author, contact, money-transfer, online-payment, signin, signup, subscription, terms).
- `src/app/dashboard/` — admin/author area. `layout.tsx` enforces `checkRole(['SUPER_ADMIN','ADMIN','AUTHOR'])` server-side and wraps content in `SiteSettingsProvider` + a Sidebar/Header shell. Subpages mirror the API surface (users, posts, categories, exchange-rates, rate-lists, advertisements, credit-rates, billing-address, subscription, service-requests, settings, reports, edit-profile).
- `src/app/setup/` — first-run super-admin bootstrap (`createSuperAdmin` server action). Allowed only when no super-admin exists, and IP-restricted in production.
- `src/app/api/` — REST routes (no `/api/posts` or `/api/users` currently — posts/users are managed via dashboard server actions and `/api/auth/[...nextauth]`).

### Authentication & access control

- `src/auth.config.ts` — provider list (Google, GitHub) plus signin/signup pages; safe to import from Edge.
- `src/auth.ts` — full NextAuth setup with `PrismaAdapter`, Credentials provider (bcrypt + Zod `LoginSchema`), JWT session (3 days), and the role/email/name embedded into the JWT. All events/callbacks live here.
- `src/auth.edge.ts` — Edge-safe `auth()` used by `middleware.ts` (cannot use bcrypt/Prisma adapter).
- `middleware.ts` — protects `/dashboard/*` and `/api/*` (except `/api/public/*`, `/api/auth/*`, `/api/debug`). Role lists come from `src/config/routes.ts` (`baseDashboardRoutes`, `authorRoutes`, `adminRoutes`, `superAdminRoutes`). `apiAuthPrefix`, `publicRoutes`, and `authRoutes` are the route group definitions. Cookie name is `__Secure-authjs.session-token` in production, `authjs.session-token` in dev. The middleware also re-checks `token.exp` and rewrites `/uploads/*` → `/api/uploads/*` via `next.config.ts`.
- `src/lib/auth.ts` — `checkRole`, `checkSuperAdmin`, `checkAdmin`, `checkAuthor`, `checkExistingSuperAdmin` server helpers; all call `redirect('/signin')` or `redirect('/')` on failure.
- `next-auth.d.ts` — module augmentation for `Session.user.role`, `emailVerified`, etc.

### Data layer

- `prisma/schema.prisma` — single schema. Notable models: `User` (with `role` enum `USER|AUTHOR|ADMIN|SUPER_ADMIN`), `Account`/`Session`/`VerificationToken` (NextAuth), `Profile`, `Post` (`status` enum `DRAFT|PENDING_REVIEW|PUBLISHED`, `postType` `STANDARD|VIDEO|GALLERY|AUDIO`), `Comment` (self-referential replies), `Like`, `SavedPost`, `View`, `Category` (self-referential parent/child), `Tag`, `Advertisement` (`AdSize`/`AdPosition` enums), `ExchangeRate` (`RateType` `BUY_SELL|SINGLE_BULK`), `RateList`, `PageView`, `Newsletter`, `SystemSettings`, `SystemLog`, `ActivityLog`, `Activity`, `CurrencyPattern`, `SocialLink`, `ServiceRequest` (with `ServiceType`/`RequestUrgency`/`ServiceRequestStatus` enums). All ID generation uses `cuid()`.
- `src/lib/db.ts` — singleton `PrismaClient` stashed on `globalThis.prismaGlobal` to survive HMR; also exports `checkDatabaseConnection()` and a `withRetry()` wrapper.
- `src/data/` — server-only data accessors (e.g. `user.ts`, `getSystemSettings.ts` uses `unstable_cache` with `tags: ['system-settings']` and 5 min revalidate, `navigation.ts`, `verfication-token.ts`).
- `src/actions/` — `'use server'` server actions. Pattern: parse with Zod, call `checkRole`/`auth`/`revalidatePath`/`revalidateTag`, return `ActionResult<T>`. Action examples: `postActions.ts` (create/update/delete posts, `getArchivePosts`, `getStats`, `getScheduledPosts`, `getViewStats`, `getRecentDrafts`), `userActions.ts` (paginated, role-aware filtering), `categoryActions.ts` (uses `cache()`), `settingsActions.ts`, `revalidateActions.ts` (`revalidateCategoryCache`, `revalidatePostCache`, `revalidateAllCache`, etc.), `createSuperAdmin.ts`, `tickerActions.ts` (`getTickerData` mixes Exir + DB), `fetchExchangeRates.ts` → `src/lib/exchange-rates.ts` (Exir v2 API with mock fallback and 60s `next: { revalidate }`).

### API surface (`src/app/api/`)

- `auth/[...nextauth]/route.ts` — re-exports NextAuth handlers.
- `categories`, `tags` — public read endpoints (paginated, search) backed by actions.
- `pageview` — POST, IP rate-limited, increments `PageView` rows.
- `upload` (POST) and `upload/delete` (DELETE) — auth-required image upload pipeline. Validates magic bytes, sanitizes SVG, converts to WebP via `sharp` (1920px max width, 85% quality), uploads to S3 (`src/lib/storage.ts`) and writes a local copy under `public/uploads/<folder>`. 10MB / 10 files / folder allowlist (`posts|avatars|categories|tags|ads|general`).
- `uploads/[...path]` — serves files from S3 with a local fallback; also reachable via the `/uploads/*` rewrite. 1-year immutable `Cache-Control`.
- `revalidate` — admin-only `revalidatePath` for the public paths in `next.config.ts`'s allowlist plus anything under `/dashboard`.
- `settings`, `system-logs`, `system-reports`, `system-status`, `activity-log` — super-admin-only operational endpoints. `system-status` runs a `SELECT 1` ping and reads `pg_stat_activity`; `reports/download` exports an XLSX via the `xlsx` package.
- `debug-session` — dev helper that returns cookie names, env presence, and a redacted session view.
- `traffic-stats` — currently mocked; lives behind auth.
- `data/routs.ts` — auth-checked handler used by the debug page; **note the typo in the filename** (don't import as `route`).
- `reports` — `getSystemReports` aggregator used by the dashboard; `reports/download` exports to XLSX.

### UI & components

- `src/components/ui/` — shadcn-style primitives (button, input, dialog, dropdown, tabs, toast, calendar, PersianDatePicker, command, etc.). Built on Radix UI; the project's `components.json` declares `@/components` + `@/lib/utils` aliases.
- `src/components/Header/Header.tsx` — server component; renders `TickerBar` (crypto + gold/FX from `getTickerData`) and `MainNav`. Dark glassmorphism; sticky.
- `src/components/Navigation/Navigation.tsx` — desktop client nav with framer-motion `layoutId` shared pill + stripe.com-style dropdown panel. `NavMobile.tsx` is the dialog/accordion mobile variant. Motion primitives live in `src/lib/motion.ts` (`STRIPE_EASE`, `LINEAR_SPRING`, `dropdownPanel`, `accordionPanel`, `staggerContainer`, `reducedMotionSafe`).
- `src/components/PostsDisplay.tsx/` — folder of components (`PostsDisplay`, `PostsList`, `PostItem`, `AdItem`) used for the masonry-style two-column post grid; `src/components/Sections/ClientSidePosts.tsx` is the tabbed client wrapper that pages `getLatestPosts` in `POSTS_PER_PAGE` chunks.
- `src/components/Dashboard/` — dashboard shell, widgets (e.g. `ServiceRequestsWidget`), pages for posts/users/etc.
- `src/components/ModernTrending/`, `src/components/PopularTopics/`, `src/components/LatestPostsFeed/`, `src/components/Widget*` — featured sections on the home page (`SectionMagazine*`, `SectionLargeSlider`, `SectionAds`, `SectionExchangeRates`, `SectionGridAuthorBox`, `SectionSliderNewAuthors`, `SectionSubscribe2`).
- `src/components/Editor1/` — Tiptap-based rich editor wired to the same `postActions` shape.
- `src/components/shared/`, `src/components/Sections/`, `src/components/Skeletons/`, `src/components/CommandPalette/`, `src/components/ImageUpload/` — utility/marketing/skeleton components.

### Styling & theme

- Tailwind CSS 4 via `@tailwindcss/postcss` (see `postcss.config.mjs`). No `tailwind.config.ts` — tokens are declared in `src/app/globals.css` inside `@theme {}` blocks (Linear/Vercel/Stripe inspired). Custom CSS variables: `--color-*` plus `--c-surface-canvas`, `--c-surface-elevated`, `--c-border-subtle`, etc. (RTL-friendly). `src/styles/index.scss` is also imported globally.
- Theme is **dark-first**: `next-themes` provider at `src/components/providers.tsx` defaults to light, but an inline no-flash script in the provider reads `localStorage['bmf-theme']` and toggles `html.dark`. `SwitchDarkMode` is the user-facing toggle.
- `src/lib/motion.ts` — the only place to tune animation durations/easings; it is consumed by Header/Nav, `ClientSidePosts`, `Motion.tsx`, etc.

### Caching & data-fetching conventions

- Heavy list queries use `unstable_cache(..., [...keys], { revalidate, tags })` with explicit `tags` (`posts`, `gallery-posts`, `latest-posts`, `featured-posts`, `categories`, `system-settings`, `advertisements`).
- Server actions call `revalidateTag(...)` (see `src/actions/revalidateActions.ts`) after mutating data; the `/api/revalidate` HTTP endpoint exists for admin-triggered revalidation from the UI.
- Page-level data fetching happens in server components (e.g. `src/app/(site)/(archives)/archive/[[...slug]]/page.tsx`); client components hydrate from the `initial*` props passed down and call server actions for further paging.

### Storage

`src/lib/storage.ts` wraps `@aws-sdk/client-s3` against the Liara endpoint. Every upload writes to **both** S3 and `public/uploads/<folder>/<filename>`, with a 1-year immutable `Cache-Control`. `getFile()` prefers S3 and falls back to the local copy. `deleteFile()` removes both. Allowed folders (used by upload, delete, and `/api/uploads/[...path]`): `posts, avatars, categories, tags, ads, general`.

### Security headers

`next.config.ts` sets HSTS (prod only), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and a long `Cache-Control` for `/uploads/*`. A CSP template is defined but **commented out** — uncomment the `Content-Security-Policy` block once you test the impact on inline scripts (the theme bootstrap script in `providers.tsx` and Sentry loader).

### Sentry & error handling

- `next.config.ts` wraps the config with `withSentryConfig` only when `NEXT_PUBLIC_SENTRY_DSN` is set; the tunnel route is `/monitoring`.
- `src/lib/error-handler.ts` — `AppError` class, `Errors` catalog, `safeAction()` wrapper returning `ActionResult<T>`, plus `logError()` which forwards to Sentry in production and to the console in dev. `src/lib/logger.ts` and `src/lib/activity-logger.ts` (`logActivity()` writes to `ActivityLog`).
- `src/lib/safe-fetch.ts` — `safeFetch()` for server components that should not crash the page on Prisma/network errors; translates Prisma error codes (`P1001`, `P2002`, `P2025`, etc.) into Persian messages.

### SEO & metadata

- Default title/description/OG/Twitter/manifest live in `src/app/layout.tsx`; per-page `generateMetadata` overrides exist on dynamic routes (e.g. `single/[[...slug]]/page.tsx`).
- `public/robots.txt` is the SEO basics file; `public/manifest.webmanifest` is referenced by metadata.

## Type & schema conventions

- `src/types/types.ts` — single barrel for app types. Uses `Prisma.validator<...>()` to define base include shapes (`userWithRelations`, `basePostWithRelations`, ...) and re-exports the Zod-inferred types from `src/schemas`. `ActionResult<T>` lives here and matches what `safeAction` returns.
- `src/schemas/index.ts` — Zod schemas for auth (`RegisterSchema`, `LoginSchema`, `ForgotPasswordSchema`, `MagicLinkSchema`), post CRUD (`CreatePostSchema`, `UpdatePostSchema`, `PostSchema`), profile (`UpdateProfileSchema`), shared `emailSchema` / `passwordSchema` / `imageUrlSchema`. Persian error messages are inline.
- `src/utils/` — pure helpers: `cn`, `toPersianNumber`, `formatNumber`, `formatDate` (date-fns + date-fns-jalali), `hexToRgb`, `animationVariants`, `convertNumbThousand`, `isSafariBrowser`, `twFocusClass`, `getTwClassByNumber`. Persian-digit conversion is shared via `src/lib/persian-dictionary.ts`.

## Custom scripts

- `scripts/seed-categories.ts` — idempotently inserts the default categories. Run with `npx tsx scripts/seed-categories.ts`.
- `scripts/check-data.js`, `scripts/link-categories.js` — ad-hoc Node scripts (no TS config) for manual data audits.

## Local agent skills

- `.claude/skills.md` — UI/UX design intelligence guide (palettes, typography, anti-patterns) used as a design reference. Apply it when designing/reviewing new UI.
- `.agents/skills/ui/SKILL.md` — product-designer prompt for AI-assisted UI work (Linear/Stripe/Vercel mental model).

## Gotchas to keep in mind

- The project is **Persian-first RTL**. Default locale is `fa-IR`, `dir="rtl"`, and `lang="fa-IR"`. Use Vazirmatn (already wired) and Persian digits in user-facing copy. Server actions and API responses use Persian error messages — keep that convention when adding new flows.
- The theme defaults to **light** but the design is **dark-first** (see `TODO.md` and the surface tokens in `globals.css`). New components should look correct against `--c-surface-canvas` and `--c-foreground`.
- The `/api/posts`, `/api/users`, and many other API paths referenced in `middleware.ts` are **not** actual files; the middleware is forward-looking and currently relies on `authRoutes`/`publicRoutes` + the allowlists. Add new dashboard APIs under `src/app/api/<name>/route.ts` only if you need a JSON surface; otherwise prefer server actions.
- `src/app/api/data/routs.ts` has a **typo** in the filename (`routs`). Don't "fix" it without updating the importer.
- `next.config.ts` has a `transpilePackages` list (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `framer-motion`) — add new ESM-only packages there if you hit bundler issues.
- `postcss.config.mjs` uses `@tailwindcss/postcss` (Tailwind v4). There is no `tailwind.config.ts`; tokens are CSS variables in `globals.css`.
- `npm run lint` runs Next.js's default ESLint; Biome is configured (`biome.json`) for formatting/imports but is not wired into the npm scripts. If you want Biome, invoke it directly.
- `react-hooks-global-state` triggers a React 19 peer-dep warning during `npm install` — it is harmless (see `README.md`).
- `middleware.ts` uses `getToken` with the **Secure** cookie name in production and the plain name in dev; if cookies are missing in production, double-check `NEXTAUTH_URL`/`AUTH_TRUST_HOST` and the cookie name.
- `docker-compose.yml` includes a hard-coded Postgres password in plain text — fine for local dev, replace before publishing.
- The Dockerfile uses Iranian npm/prisma/sharp mirrors; remove `registry.docker.ir/*` and the `PRISMA_ENGINES_MIRROR` overrides for non-Iranian builds.



