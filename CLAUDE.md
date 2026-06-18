# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Working Rules

> **نقش**: من یک **Principal Full-Stack Architect** هستم؛ هم فرانت‌اند و هم بک‌اند.
> فایل تفصیلی: `ARCHITECT_RULES.md` (در ریشه‌ی پروژه).

**زبان**: تمام پاسخ‌ها و توضیحات متنی به **فارسی** نوشته می‌شوند. نام فایل‌ها، مسیرها، شناسه‌ها و فرمان‌های ترمینال به **انگلیسی**.

**قوانین کلیدی (خلاصه)**:
- قبل از هر تغییر، کد موجود بررسی شود؛ هرگز حدس نزن.
- اصل DRY در هر دو لایه؛ کد/استایل تکراری ممنوع.
- Patch موقت ممنوع؛ Refactor اصولی انجام شود.
- هیچ API، Schema یا Contract موجود شکسته نشود.
- هیچ تغییری بدون بررسی RTL، ریسپانسیو، Dark Mode، A11y (WCAG 2.2 AA) و Performance تحویل نشود.
- فرانت و بک باید هماهنگ باشند (Type مشترک، Validation دو لایه).
- منطق حساس (مالی، احراز هویت، پرداخت) هرگز در کلاینت قرار نگیرد.
- همیشه برنامه‌ی اجرای مرحله‌ای ارائه شود، سپس پیاده‌سازی آغاز شود.
- سیستم طراحی: OKLCH، CSS Variables، Design Tokens، Fluid Spacing/Typography، Variable Fonts، پشتیبانی کامل RTL، CSS مدرن (Container Queries، Scroll-driven، Logical Properties، :has()، prefers-reduced-motion).
- استایل الهام‌گرفته از Linear، Arc، Vercel، Framer، Stripe، Notion. مینیمال، حرفه‌ای، Premium، انسانی.
- از رنگ‌ها و افکت‌های نمایشی AI پرهیز شود.
- Placeholder، TODO، کد ناقص و فایل نیمه‌کاره ممنوع.

برای جزئیات کامل به `ARCHITECT_RULES.md` مراجعه شود.

## Project

A full-stack Persian (RTL) financial blog and market-rates platform. Next.js 16 App Router + React 19 + TypeScript, Prisma/PostgreSQL, NextAuth v5. UI text, comments, and many code comments are in Persian. Beyond blogging it serves live currency/market rates (exchange rates, tickers) and money-transfer/online-payment service requests.

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build (next build)
npm start            # serve production build
npm run lint         # next lint

# Database (Prisma)
npx prisma migrate dev      # apply/create migrations in dev
npx prisma generate         # regenerate client (also runs on postinstall)
npx prisma studio           # DB browser
npm run db:seed             # node prisma/seed.js
npm run db:reset            # reset + seed 50 posts (scripts/reset-and-seed-50-posts.js)
npm run db:fresh            # prisma migrate reset --force && db:seed
npm run db:stats            # scripts/db-stats.js
```

Linting/formatting is **Biome** (`biome.json`), not ESLint/Prettier — config: single quotes, 2-space indent, 100 col, `useConst`/`noVar`/`useTemplate` as errors, `noDangerouslySetInnerHtml` as error. `npm run lint` still runs `next lint`; run Biome directly (`npx biome check`/`npx biome format`) to match enforced style. There is no test runner configured; the `scripts/` folder holds ad-hoc Node/PowerShell verification scripts, not a test suite.

## Architecture

**Auth is split for the Edge runtime.** `src/auth.config.ts` is Edge-safe (OAuth providers + pages only, no Prisma) and is imported by middleware-adjacent code. `src/auth.ts` is the full config (Prisma adapter, Credentials provider with bcrypt, JWT callbacks that put `role`/`id` on the token and session). Session strategy is JWT (3-day maxAge). When changing what's on the session, update both the `jwt` and `session` callbacks in `auth.ts` and `next-auth.d.ts`.

**RBAC lives in middleware + a central route table.** `src/config/routes.ts` declares `publicRoutes`, `authRoutes`, and role-scoped route arrays (`authorRoutes`, `adminRoutes`, `superAdminRoutes`). `middleware.ts` decodes the JWT and enforces access by matching the pathname against compiled matchers. Roles are hierarchical: `SUPER_ADMIN > ADMIN > AUTHOR > USER` (see `getAccessibleRoutes`). The middleware `matcher` is intentionally narrow — only `/dashboard`, non-public `/api`, and auth pages run middleware, so public marketing/blog pages skip JWT decode entirely. To protect a new dashboard/API route, add it to the correct array in `routes.ts` (and `adminApiRoutes`/`authorApiRoutes` inside `middleware.ts` for APIs) — don't add ad-hoc auth checks in the page.

**Data access is server-first via Server Actions.** `src/actions/` holds the primary read/write layer (`getPosts.ts`, `postActions.ts`, `marketTickerActions.ts`, etc.) called directly from Server Components. `src/app/api/` route handlers exist mainly for client-fetched/public endpoints. Prefer adding a server action over an API route unless the data must be fetched from the client or be publicly callable.

**Prisma client is a global singleton** (`src/lib/db.ts`, default export) with `withRetry`/`checkDatabaseConnection` helpers. Always import from `@/lib/db`; never `new PrismaClient()`. The schema (`prisma/schema.prisma`) carries deliberate composite indexes tuned to specific query shapes (each annotated with a dated comment explaining the query it serves) — when changing a hot query's `where`/`orderBy`, check whether an existing composite index still covers it before adding a new one.

**App Router structure.** `src/app/(site)/` is the public site, organized by route groups: `(home)`, `(archives)`, `(singles)`, `(others)` (auth pages), plus feature dirs. `src/app/dashboard/` is the authenticated admin/author area. The home page has multiple swappable "design" variants under `(home)/designs/` (e.g. `Design7.tsx`) and market-rate ticker components there.

**Market rates pipeline.** Live Iranian market rates come from the Navasan API (`src/lib/navasan.ts`, key `NAVASAN_API_KEY`) with a fallback chain: external API → DB (`ExchangeRate`/`RateList` models) → auto-derive. Related: `src/lib/exchange-rates.ts`, `freeMarketRates.ts`, `rateItem.ts`, and ticker actions. Navasan `value` is in **Toman, used raw** (no `/10` rial conversion).

**Cross-cutting infra.** Rate limiting via Upstash Redis with in-memory LRU fallback when Redis env vars are absent (`src/lib/rate-limiter.ts` — separate limiters for api/upload/auth). File uploads go to S3-compatible Liara storage (`src/lib/storage.ts`, `src/actions/S3Actions.ts`); `/uploads/:path*` is rewritten to `/api/uploads/:path*`. Email via Resend (`src/lib/mail.ts`). Error tracking via Sentry — only wrapped in production with a DSN set (see `next.config.ts`). Rich text editing uses Tiptap (`src/components/Editor1/`).

**Persian/RTL & dates.** The app is RTL-first; styles in `src/styles/` include `__theme_rtl.scss`. Use `src/lib/persian-date.ts` and `date-fns-jalali` for Jalali calendar dates rather than raw `date-fns`.

## Conventions

- Import alias: `@/*` → `src/*`.
- Two Next config files exist (`next.config.ts` is the active one; `next.config.js` is legacy). Edit `next.config.ts`. It enables `output: 'standalone'`, incremental PPR, `optimizePackageImports` for `lucide-react`/`react-icons`, a strict prod CSP, and the image `remotePatterns` allowlist — adding an external image host requires adding it there.
- Schema validation uses Zod (`src/schemas/`, `@/schemas`); reuse `LoginSchema` etc. rather than hand-validating.
- New env vars: document in `.env.example`. Required for boot: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`.
