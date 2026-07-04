# AGENTS.anti-failure.md — AI self-correction checklist

Load **at the end of every task** before reporting completion.

## 1. Context Amnesia

Forgot earlier decisions / project conventions.
**Prevention**: Re-read 3–5 relevant files; use todos; record key decisions.

## 2. Stale Snapshot

Edited file based on outdated version.
**Prevention**: If any bash command ran since last read, re-read before editing.

## 3. Not Searching Before Creating

Built duplicate components.
**Prevention**: Grep/find first. Reuse → Refactor → Extend.

## 4. Partial or Inconsistent Changes

Updated one file, missed related sites.
**Prevention**: `lsp_references` before renames; grep for old name after edits; update `next.config.ts` allowlists; document new env vars.

## 5. Skipping Verification

Claimed done without running tsc/lint/build.
**Prevention**: TS changes → `npx tsc --noEmit`. Style changes → `npm run lint`.

## 6. Over-Engineering

Generic system for simple need.
**Prevention**: Solve exact problem; generalize only after 3rd duplication. No new libs unless asked.

## 7. Performance Regression

N+1 queries, unoptimized images, blocking loads.
**Prevention**: `unstable_cache` + correct tags; paginate unbounded reads; `Image` + `next/font`; lazy-load heavy components; profile bundle.

## 8. Cache Invalidation Bugs

DB writes that don't bust `unstable_cache`.
**Prevention**: Import `revalidateTag` from `@/lib/revalidate`; invalidate matching tags on every write; for direct DB writes (seed/migration), call action or `revalidatePath`.

## 9. Security Leaks

Stack traces, env values, raw DB errors to users.
**Prevention**: Standard `{ success: false, error: { code, message } }` shape; validate/sanitize; use `requireUser` / `requireRole` / `requireAdmin` / `requireSuperAdmin` / `requireAuthor`; keep secrets out of client / `NEXT_PUBLIC_*`.

## 10. Unsafe Database Changes

Destructive migrations, missing indexes, N+1.
**Prevention**: Reversible migrations or rollback plan; never drop populated column without backup; index FKs and filtered columns; review Prisma queries.

## 11. Accessibility Blind Spots

Missing labels, alt, focus, contrast.
**Prevention**: Semantic HTML + Radix; don't rely on color alone; respect `prefers-reduced-motion`.

## 12. Inconsistent Naming / Language Mix

Persian vars, English UI copy mixed.
**Prevention**: English in code/commands/paths/filenames; Persian only in user-facing copy.

## 13. Not Cleaning Up

Temp files, unused imports, dead branches, debug logs.
**Prevention**: Remove at task end; `git status` and stage only intended files; never `git add -A`.

## 14. Scope Creep

Doing too much or too little.
**Prevention**: Confirm acceptance criteria before building; update todos as scope shifts.

## 15. Wrong Tool for the Job

Bash for reading, sed for editing, destructive git.
**Prevention**: `read` for reading, `edit` for editing, `grep` for searching. Avoid `git reset --hard`, `push --force`, `clean -f` on protected branches.

## 16. Ignoring Project Conventions

Breaking RTL, logical props, response shape, cache tags, auth helpers.
**Prevention**: Read 2–3 representative files before writing in that area; follow conventions.