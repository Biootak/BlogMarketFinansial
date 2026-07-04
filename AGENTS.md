# AGENTS.md

> Persian-first financial blog (`blogmarketfinansial.ir`) on Next.js 16 + Prisma + PostgreSQL + NextAuth v5.
> User-facing copy is Persian; user expects Persian in replies, English in code/commands/paths.

## Workflow — Build → Show → Improve

**No plan phase.** Search fast (for Reuse) → Edit → User tests visually → Improve.

- Before code: only quick grep/find to avoid duplicates (Reuse → Refactor → Extend).
- After code: `npx tsc --noEmit` if new TypeScript written; skip for tiny CSS/UI tweaks.
- User tests visually and says "fix" or "good".

Only write a brief analysis (not a long plan) for: DB / migration / auth / security / caching / routing, or when user says "big" / "architecture changes".

## Mandatory declaration (start of every task)

> "AGENTS.md را خواندم. پلن نمی‌نویسم — مستقیم می‌سازم (Build → Show → Improve)."

## Critical conventions (always-on)

- **RTL** global (`html dir="rtl" lang="fa-IR"`). Use logical properties — never hardcode `left/right`.
- **TypeScript strict**; no `any`, `ts-ignore`, TODO, placeholder.
- **API response shape**: `{ success: true, data }` or `{ success: false, error: { code, message } }`.
- **Cache tags** (`unstable_cache`): `posts`, `archive`, `featured-posts`, `latest-posts`, `popular-posts`, `post-{id}`, `post-slug`, `post-by-slug`, `comments`, `categories`, `tags`, `sidebar-data`, `dashboard-stats`, `ticker`, `exchange-rates`, `header-ad`, `advertisements`, `rate-lists`, `dashboard-{section}`.
- **`revalidateTag`** must come from `@/lib/revalidate`, never `next/cache`.
- **Prisma** singleton: import from `@/lib/db`. Don't `new PrismaClient()`.
- **English** in code/commands/paths. **Persian** in user-facing copy only.

## Topic files — load ONLY when relevant

**Don't load all.** Read 1–2 at most, based on the task:

| Topic | File | Load when |
|-------|------|-----------|
| Repo layout | `AGENTS.repo.md` | First task in a new area |
| npm / dev commands | `AGENTS.commands.md` | Running scripts, db ops, builds |
| Env variables | `AGENTS.env.md` | Adding config, debugging env |
| Style & tooling | `AGENTS.style.md` | Writing any code (extended reference) |
| Gotchas | `AGENTS.gotchas.md` | Anything weird happening |
| MCPs (graphify + runtime) | `AGENTS.mcp.md` | Codebase navigation, runtime MCP usage (cu/matrix/playwright/trash) |
| UI design direction | `AGENTS.ui-design.md` | Visual / UX work |
| Architecture rules | `AGENTS.architecture.md` | Multi-file changes, DB, auth |
| Anti-failure checklist | `AGENTS.anti-failure.md` | Before claiming a task done |

## Other rules

- `ARCHITECT_RULES.md` — Role + workflow + non-negotiable rules (lean core).
- `.claude/role/SKILL.md` — Role section mirror (no AGENTS.md duplicate).
- `.kimchi/AGENTS.md` — Trigger file: when user message starts with `قوانین` / `با قوانین` / `AGENTS` / `rules`, re-load rules first.