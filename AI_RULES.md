# Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript. All routes live under `src/app/`, organized into route groups: `(site)` public pages, `(auth)`, `dashboard`, `(customer)/customer`, `(exchange)`.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) plus CSS Modules (`.module.css`) for page-scoped styles. RTL/Persian-first design (Vazirmatn font).
- **UI primitives**: Radix UI wrappers in shadcn/ui style (`class-variance-authority` + `clsx` + `tailwind-merge`; aliases `@/components`, `@/lib/utils`). Icons via `lucide-react`.
- **Database**: PostgreSQL via Prisma ORM (`prisma/schema.prisma`, singleton client at `@/lib/db`). Migrations + seed scripts live in `prisma/`.
- **Auth**: NextAuth v5 (beta) with `@auth/prisma-adapter`. Config split across `src/auth.ts`, `src/auth.config.ts`, `src/auth.edge.ts` (middleware-safe).
- **Server logic**: Server Actions in `src/actions/*.ts` are the primary mutation/read layer; Route Handlers under `src/app/api/` for webhooks, cron jobs, uploads, and public JSON APIs.
- **Validation & forms**: `zod` for all schema validation; `react-hook-form` + `@hookform/resolvers` on the client.
- **Client state & data fetching**: `swr` for client-side data fetching, `zustand` for client state. Server components fetch directly through server actions / Prisma — no API round-trips needed.
- **Rich content**: Tiptap editor for posts, `react-markdown` (+ remark/rehype plugins) for markdown rendering, sanitized with `isomorphic-dompurify`.
- **Tooling**: Biome (lint/format), Vitest (unit tests), Playwright (browser automation), Turbopack for dev/build, Sentry for monitoring, AWS SDK S3 for file storage, Resend for email, Upstash for rate limiting.

# Library Rules

## Use what's already installed
| Task | Library | Do NOT use |
|---|---|---|
| Icons | `lucide-react` | other icon sets unless already imported in that file |
| Dates | `date-fns`, `date-fns-jalali` (Persian calendar) | moment/dayjs |
| Class merging | `clsx` + `tailwind-merge` (via `@/lib/utils` `cn()`) | manual string concat |
| IDs | `uuid` | `nanoid`, `cuid` |
| Slugs | `slugify` | hand-rolled slug functions |
| HTTP rate limiting | `@upstash/ratelimit` | ad-hoc counters |
| Sanitizing user HTML | `isomorphic-dompurify` | raw `dangerouslySetInnerHTML` |
| Phone validation | `libphonenumber-js` | regex |
| Excel export | `exceljs` | xlsx packages |
| Charts | `recharts` / `react-chartjs-2` (match the file's existing choice) | mixing both in one feature |
| Drag & drop | `@dnd-kit/*` | react-dnd |

## Conventions
- **Mutations** go through Server Actions (`src/actions/`), never custom API routes called from client code — except webhooks, cron endpoints, uploads, and external consumers which use `src/app/api/`.
- Validate every server action input with `zod`; never trust client payloads.
- Guard auth with existing helpers (`requireUser` from `@/lib/require-auth`, NextAuth session) — don't roll your own session checks.
- Access Prisma only through the shared singleton (`import prisma from '@/lib/db'`). Never instantiate `new PrismaClient()` in routes/actions.
- Prefer Server Components by default; add `"use client"` only when interactivity is required. Co-locate route-specific pieces in `_components/` next to their `page.tsx`.
- Styling: Tailwind utilities first; use a `.module.css` file only when the surrounding page/route group already does so or when complex keyframes/scoped styles demand it.
- Keep new UI consistent with existing Radix/shadcn-style components in `src/components/`; do not edit generated shadcn files — create new components instead.
- Lint/format with Biome (`npm run lint`), test with Vitest (`npm run test`), typecheck with `npm run typecheck` before finishing work.
