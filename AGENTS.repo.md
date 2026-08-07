# AGENTS.repo.md — Repository Layout

Load when working in a new area of the codebase, or when you need to know which folder holds what.

## Folder structure

- `src/app/(site)/` — public marketing/blog pages (`(home)`, `(singles)`, `(archives)`, `(others)`).
- `src/app/dashboard/` — role-gated dashboard (`posts`, `categories`, `users`, `settings`, `exchange-rates`, `reports`, …).
- `src/app/api/` — route handlers (`auth/[...nextauth]`, `upload`, `uploads/[...path]`, `public/*`, `pageview`, `reports/*`, `health/dashboard`).
- `src/app/setup/` — bootstrap page that creates the first `SUPER_ADMIN`. **IP-gated in production** by `ALLOWED_SETUP_IPS`.
- `src/actions/*.ts` — every file starts with `'use server';`. Write paths here are the only place that can `revalidateTag`.
- `src/lib/` — `db.ts` (Prisma singleton), `auth.ts`, `require-auth.ts`, `rate-limiter.ts`, `storage.ts` (S3-compatible), `revalidate.ts`, `exchange-rates.ts`, `tgju.ts`, `freeMarketRates.ts`, `safe-cache.ts`, `safe-fetch.ts`, `email/` (provider-neutral).
- `src/components/ui/` — shadcn-style primitives. Add new components here.
- `prisma/` — `schema.prisma`, one-time `migrations/20240822064751_biotak/`, `seed.js` (idempotent, covers 22 models).
- `src/components/Dashboard/DashboardPage/v2/` — June 2026 dashboard redesign. CSS at tail of `src/app/globals.css` (search `Dashboard 2026 (June 22)`).