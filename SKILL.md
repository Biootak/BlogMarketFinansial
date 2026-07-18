# SKILL.md — Build Loop (self-enforcing)

> Auto-loads on any UI / component / page / full-stack task.
> Purpose: re-anchor the agent to project standards EVERY task, mid-task too,
> so quality does not degrade as the conversation grows.

## When to use
Any task touching: components, pages, UI, styling, layout, design, dashboards, or full-stack features.

## The loop (run in order, no skipping)

### 0. Re-anchor (before anything else — also re-run after long analysis)
Read, do not trust memory:
- `AGENTS.md` → Directives + SELF-ENFORCING LOOP + Definition of Done
- `DESIGN.md` → tokens, craft, anti-patterns, roadmap
- `COMPONENTS.md` → canonical components, forbidden duplicates, required states
- `PDK.md` (always)
Think in English; research foreign sources (internet-first rule). Persian only in user-facing copy.

### 1. Audit (reuse before create)
- Grep the repo for an existing component/util matching the need.
- Fill the component map: `| element | existing impl | decision (reuse/extend/compose/create) |`.
- Do NOT create a parallel implementation.

### 2. Research (non-trivial UI only)
- `websearch` the 2026 best practice for the specific pattern.
- Fetch 1–2 professional open-source refs (shadcn-ui/ui, Layered-UI, Durple). Read source, extract pattern, adapt to OUR tokens. Delete after use — never fork/vendor/depend.

### 3. Build
- Canonical components only (`ui/*` + `Dashboard/primitives`). Tokens only (`--ds-*`/`--nova-*`). Logical RTL props.
- Handle ALL states: loading / empty / error / disabled / success.
- Max ~400 lines/file; one concern per file; no `any`/`@ts-ignore`/stub/`console.log`/TODO.

### 4. Verify (mechanical gate — non-negotiable)
Run `npm run verify` (tsc + biome + anti-pattern scan).
- If RED: fix until GREEN. Never report done on red.
- If GREEN: self-check the Definition of Done item-by-item.

### 5. Show & improve
Present to user; iterate on "fix" / "good". Repeat the loop, not the prompt.

## Non-negotiable reminders
- The rules are enforced by `npm run verify`, not by memory.
- Re-read the sources in step 0 even mid-task — analysis erodes recall.
- ds/* is dead; ~14 modal systems must consolidate to ui/dialog + ui/sheet.
- Global CSS is frozen except tokens + anim-*; use co-located CSS Modules.
