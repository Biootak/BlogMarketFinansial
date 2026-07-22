# Automatic Rules Trigger

> Project-level override loaded alongside the root `AGENTS.md` and `ARCHITECT_RULES.md`.

## Trigger Word

When the user starts any message with one of these triggers, the agent MUST read the project guardrails **before any other action** (including exploration, search, or response):

- `قوانین`
- `با قوانین`
- `AGENTS`
- `rules`

## Required Files to Read

Use the `read` tool to load these files in order:

1. `AGENTS.md` — core rules (compact, ~250 lines)
2. `ARCHITECT_RULES.md`
3. `.claude/role/SKILL.md` (mirrored content; read to confirm it is in sync)

Load **only when relevant** (per Topic files table in AGENTS.md):
- `AGENTS.uidqg.md` — when task involves UI/visual files
- `AGENTS.19dqg.md` — before every "done" declaration
- `AGENTS.market-rates.md` — when working on market-rates pipeline or crons
- Other topic files per AGENTS.md §Topic files table

## Verification

After reading, begin the response with the mandatory declaration from `AGENTS.md`:

> "AGENTS.md را خواندم. پلن نمی‌نویسم — مستقیم می‌سازم (Build → Show → Improve)."

Then proceed with the user's request following the workflow rules in those documents.
