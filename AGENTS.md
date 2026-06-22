# AGENTS.md

> Persian-first financial blog (`blogmarketfinansial.ir`) on Next.js 16 + Prisma + PostgreSQL + NextAuth v5.
> Before any non-trivial change, read `ARCHITECT_RULES.md` and `.claude/role/SKILL.md` (same content, mirrored).
> User-facing copy is Persian; the user expects Persian in replies, English in code/commands/paths.

## Repo layout

- `src/app/(site)/` — public marketing/blog pages (`(home)`, `(singles)`, `(archives)`, `(others)`).
- `src/app/dashboard/` — role-gated dashboard (`posts`, `categories`, `users`, `settings`, `exchange-rates`, `reports`, …).
- `src/app/api/` — route handlers (`auth/[...nextauth]`, `upload`, `uploads/[...path]`, `public/*`, `pageview`, `reports/*`, `health/dashboard`).
- `src/app/setup/` — bootstrap page that creates the first `SUPER_ADMIN`. **IP-gated in production** by `ALLOWED_SETUP_IPS`.
- `src/actions/*.ts` — every file starts with `'use server';`. Write paths here are the only place that can `revalidateTag`.
- `src/lib/` — `db.ts` (Prisma singleton), `auth.ts`, `rate-limiter.ts` (Upstash Redis + in-memory LRU fallback), `storage.ts` (S3/Liara), `revalidate.ts` (Next-16-safe `revalidateTag` wrapper), `exchange-rates.ts`, `tgju.ts` (scraper client), `freeMarketRates.ts`, `safe-cache.ts` / `safe-fetch.ts` (network wrappers).
- `src/components/ui/` — shadcn-style primitives. Do not recreate; add new components there.
- `prisma/` — `schema.prisma`, one-time `migrations/20240822064751_biotak/`, `seed.js` (idempotent, covers 22 models).
- `src/components/Dashboard/DashboardPage/v2/` — June 2026 dashboard redesign. CSS lives at the tail of `src/app/globals.css` (search `Dashboard 2026 (June 22)`).

## Commands

```bash
npm install            # also runs `prisma generate` via postinstall
npm run dev            # next dev --webpack (Turbopack panics on globals.css via lightningcss)
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

## Gotchas that are easy to miss

- **Turbopack panics on `globals.css`** — `lightningcss-1.0.0-alpha.68` unwraps an `Err` at color.rs:441 against the current stylesheet. `package.json` already pins `next dev --webpack` (commit `ae82673`); using `npx next dev` (no flag) falls back to Turbopack and crashes the compile. The dev console will surface the panic verbatim — react with `npm run dev` instead.
- **Dashboard 2026 v2 CSS is large (~660 lines) and lives at the tail of `globals.css`** — a previous failed `git stash pop` lost the whole block. If `dash-bento2`, `dash-pane--hero/--compact/--tall`, `dash-toolbar`, `dash-hero*`, `dash-minical`, etc. render unstyled, search the file for `Dashboard 2026 (June 22)` — that header is the only marker. The block must be wrapped in its own `@layer utilities` (the Aurora `.dash-scope` block uses the same layer above).
- **Disposing dev servers** — `npx next dev --webpack` keeps a `next-server` child even after the parent shell exits. Use `Get-NetTCPConnection -LocalPort <port> | Stop-Process -Id $_.OwningProcess -Force` to clean up; a bare `Stop-Job` leaves the port bound.
- **`scripts/test-safe-cache.js` / `scripts/test-safe-fetch.js`** — disposable helpers used while verifying the v2 dashboard's data layer. Not committed to git; safe to delete after use.

## When in doubt

- The repo already had a code review pass in mid-June 2026 (`2026-06-14`/`2026-06-16` comments throughout the codebase). Skim those before refactoring — they explain non-obvious choices (per-route auth opt-in, hot-path regex precompilation, single-write S3, etc.).
- For architectural rules (DRY, rollback migrations, rate limits, accessibility, performance budgets, change-report format), defer to `ARCHITECT_RULES.md`.


# ui-ux-pro-max

Comprehensive design guide for web and mobile applications. Contains 67 styles, 96 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types across 13 technology stacks. Searchable database with priority-based recommendations.

## Prerequisites

Check if Python is installed:

```bash
python3 --version || python --version
```

If Python is not installed, install it based on user's OS:

**macOS:**
```bash
brew install python3
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install python3
```

**Windows:**
```powershell
winget install Python.Python.3.12
```

---

## How to Use This Skill

When user requests UI/UX work (design, build, create, implement, review, fix, improve), follow this workflow:

### Step 1: Analyze User Requirements

Extract key information from user request:
- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page, etc.
- **Style keywords**: minimal, playful, professional, elegant, dark mode, etc.
- **Industry**: healthcare, fintech, gaming, education, etc.
- **Stack**: React, Vue, Next.js, or default to `html-tailwind`

### Step 2: Generate Design System (REQUIRED)

**Always start with `--design-system`** to get comprehensive recommendations with reasoning:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This command:
1. Searches 5 domains in parallel (product, style, color, landing, typography)
2. Applies reasoning rules from `ui-reasoning.csv` to select best matches
3. Returns complete design system: pattern, style, colors, typography, effects
4. Includes anti-patterns to avoid

**Example:**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
```

### Step 2b: Persist Design System (Master + Overrides Pattern)

To save the design system for hierarchical retrieval across sessions, add `--persist`:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

This creates:
- `design-system/MASTER.md` — Global Source of Truth with all design rules
- `design-system/pages/` — Folder for page-specific overrides

**With page-specific override:**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

This also creates:
- `design-system/pages/dashboard.md` — Page-specific deviations from Master

**How hierarchical retrieval works:**
1. When building a specific page (e.g., "Checkout"), first check `design-system/pages/checkout.md`
2. If the page file exists, its rules **override** the Master file
3. If not, use `design-system/MASTER.md` exclusively

### Step 3: Supplement with Detailed Searches (as needed)

After getting the design system, use domain searches to get additional details:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**When to use detailed searches:**

| Need | Domain | Example |
|------|--------|---------|
| More style options | `style` | `--domain style "glassmorphism dark"` |
| Chart recommendations | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Alternative fonts | `typography` | `--domain typography "elegant luxury"` |
| Landing structure | `landing` | `--domain landing "hero social-proof"` |

### Step 4: Stack Guidelines (Default: html-tailwind)

Get implementation-specific best practices. If user doesn't specify a stack, **default to `html-tailwind`**.

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

---

## Search Reference

### Available Domains

| Domain | Use For | Example Keywords |
|--------|---------|------------------|
| `product` | Product type recommendations | SaaS, e-commerce, portfolio, healthcare, beauty, service |
| `style` | UI styles, colors, effects | glassmorphism, minimalism, dark mode, brutalism |
| `typography` | Font pairings, Google Fonts | elegant, playful, professional, modern |
| `color` | Color palettes by product type | saas, ecommerce, healthcare, beauty, fintech, service |
| `landing` | Page structure, CTA strategies | hero, hero-centric, testimonial, pricing, social-proof |
| `chart` | Chart types, library recommendations | trend, comparison, timeline, funnel, pie |
| `ux` | Best practices, anti-patterns | animation, accessibility, z-index, loading |
| `react` | React/Next.js performance | waterfall, bundle, suspense, memo, rerender, cache |
| `web` | Web interface guidelines | aria, focus, keyboard, semantic, virtualize |
| `prompt` | AI prompts, CSS keywords | (style name) |

### Available Stacks

| Stack | Focus |
|-------|-------|
| `html-tailwind` | Tailwind utilities, responsive, a11y (DEFAULT) |
| `react` | State, hooks, performance, patterns |
| `nextjs` | SSR, routing, images, API routes |
| `vue` | Composition API, Pinia, Vue Router |
| `svelte` | Runes, stores, SvelteKit |
| `swiftui` | Views, State, Navigation, Animation |
| `react-native` | Components, Navigation, Lists |
| `flutter` | Widgets, State, Layout, Theming |
| `shadcn` | shadcn/ui components, theming, forms, patterns |
| `jetpack-compose` | Composables, Modifiers, State Hoisting, Recomposition |

---

## Example Workflow

**User request:** "Làm landing page cho dịch vụ chăm sóc da chuyên nghiệp"

### Step 1: Analyze Requirements
- Product type: Beauty/Spa service
- Style keywords: elegant, professional, soft
- Industry: Beauty/Wellness
- Stack: html-tailwind (default)

### Step 2: Generate Design System (REQUIRED)

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service elegant" --design-system -p "Serenity Spa"
```

**Output:** Complete design system with pattern, style, colors, typography, effects, and anti-patterns.

### Step 3: Supplement with Detailed Searches (as needed)

```bash
# Get UX guidelines for animation and accessibility
python3 skills/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux

# Get alternative typography options if needed
python3 skills/ui-ux-pro-max/scripts/search.py "elegant luxury serif" --domain typography
```

### Step 4: Stack Guidelines

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack html-tailwind
```

**Then:** Synthesize design system + detailed searches and implement the design.

---

## Output Formats

The `--design-system` flag supports two output formats:

```bash
# ASCII box (default) - best for terminal display
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown - best for documentation
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

---

## Tips for Better Results

1. **Be specific with keywords** - "healthcare SaaS dashboard" > "app"
2. **Search multiple times** - Different keywords reveal different insights
3. **Combine domains** - Style + Typography + Color = Complete design system
4. **Always check UX** - Search "animation", "z-index", "accessibility" for common issues
5. **Use stack flag** - Get implementation-specific best practices
6. **Iterate** - If first search doesn't match, try different keywords

---

## Common Rules for Professional UI

These are frequently overlooked issues that make UI look unprofessional:

### Icons & Visual Elements

| Rule | Do | Don't |
|------|----|----- |
| **No emoji icons** | Use SVG icons (Heroicons, Lucide, Simple Icons) | Use emojis like 🎨 🚀 ⚙️ as UI icons |
| **Stable hover states** | Use color/opacity transitions on hover | Use scale transforms that shift layout |
| **Correct brand logos** | Research official SVG from Simple Icons | Guess or use incorrect logo paths |
| **Consistent icon sizing** | Use fixed viewBox (24x24) with w-6 h-6 | Mix different icon sizes randomly |

### Interaction & Cursor

| Rule | Do | Don't |
|------|----|----- |
| **Cursor pointer** | Add `cursor-pointer` to all clickable/hoverable cards | Leave default cursor on interactive elements |
| **Hover feedback** | Provide visual feedback (color, shadow, border) | No indication element is interactive |
| **Smooth transitions** | Use `transition-colors duration-200` | Instant state changes or too slow (>500ms) |

### Light/Dark Mode Contrast

| Rule | Do | Don't |
|------|----|----- |
| **Glass card light mode** | Use `bg-white/80` or higher opacity | Use `bg-white/10` (too transparent) |
| **Text contrast light** | Use `#0F172A` (slate-900) for text | Use `#94A3B8` (slate-400) for body text |
| **Muted text light** | Use `#475569` (slate-600) minimum | Use gray-400 or lighter |
| **Border visibility** | Use `border-gray-200` in light mode | Use `border-white/10` (invisible) |

### Layout & Spacing

| Rule | Do | Don't |
|------|----|----- |
| **Floating navbar** | Add `top-4 left-4 right-4` spacing | Stick navbar to `top-0 left-0 right-0` |
| **Content padding** | Account for fixed navbar height | Let content hide behind fixed elements |
| **Consistent max-width** | Use same `max-w-6xl` or `max-w-7xl` | Mix different container widths |

---

## Pre-Delivery Checklist

Before delivering UI code, verify these items:

### Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Brand logos are correct (verified from Simple Icons)
- [ ] Hover states don't cause layout shift
- [ ] Use theme colors directly (bg-primary) not var() wrapper

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Light/Dark Mode
- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery

### Layout
- [ ] Floating elements have proper spacing from edges
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected
