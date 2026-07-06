---
name: session-resume
description: Load this skill at the start of any session if `E:\FinancialMarket\.harness\HANDOFF.md` exists, OR when user asks for resume/ادامه بده/continue/last-task. It restores context from disk-based handoff files so work continues seamlessly across token-exhaustion, account changes, or fresh sessions.
---

# Session Resume Protocol

You are continuing work from a previous session that lost its context (token exhaustion, account swap, fresh window). The previous session left files on disk that explain what happened. Recover context, do not re-read unrelated code, do not redo completed work.

## When to load
- First message of a fresh session in this workspace, OR
- User says one of: «ادامه بده», «از کجا بودیم», «resume», «continue», «last task», «status», «از آخرین ناتمام»
- Detect: if `.harness/HANDOFF.md` exists in this workspace, offer to resume before doing anything else.

## Step 1 — Read handoff files (in order)

1. `E:\FinancialMarket\.harness\HANDOFF.md` — full plan + decisions + checklist
2. `E:\FinancialMarket\docs\STATUS.md` — quick snapshot
3. `E:\FinancialMarket\.harness\.journal.log` — line-by-line tool history (if exists)
4. `E:\FinancialMarket\.harness\CONVENTIONS.md` — workspace rules (if exists)

Try to read these with `Read` tool. If Read is unavailable, fall back to `cat`/`type` via `Bash`.

## Step 2 — Synthesize a 5-line status report

Output exactly this format (Persian, plain text, no fluff):

```
آخرین وضعیت:
  - هدف: <یک جمله>
  - چی شد: <۲-۳ مورد مهم>
  - چی مونده: <۱-۳ مورد>
  - فایل‌های کلیدی: <۳-۵ مسیر>

از کجا شروع کنیم؟ <پیشنهاد من> یا <چیز دیگه‌ای می‌خوای>؟
```

Do not start coding. Do not re-explain the whole plan. The user knows the plan — they want the resume point.

## Step 3 — Wait for direction

The user picks the resume point. Then:
1. Update `.harness/HANDOFF.md` status header to `IN_PROGRESS`.
2. Execute only the chosen step. Do not expand scope.
3. When the step is complete, status → `DONE`, write one journal line summarizing it.

## Hard rules

- **Never** re-read files that the journal shows were edited in the previous session — trust the handoff.
- **Never** assume what changed without checking the journal or git diff.
- **Always** confirm with the user before resuming — they may want to throw it all out and start a new task.
- **Never** skip the Status Report. It is the whole point of this skill.

## Failure modes

- HANDOFF.md missing → say so, ask if user wants to start fresh or build a new handoff.
- Journal exists but HANDOFF missing → read journal for last 20 lines, reconstruct loosely, ask user to confirm before continuing.
- User says «skip» or «تازه شروع کن» → forget handoff, treat as new task.

## Example opening (after Step 2)

> آخرین وضعیت:
>   - هدف: حرفه‌ای‌سازی آیکون‌های هدر Editor1
>   - چی شد: ۱۳ فایل ادیت شد، Icon registry ریفکتور، brand/save آیکون گرفتن
>   - چی مونده: visual test کاربر + tsc/build
>   - فایل‌های کلیدی: `src/components/ui/icon.tsx`, `editor.tsx`, `shell.scss`
>
> از کجا شروع کنیم؟ tsc/build اول، یا صبر کنیم visual test تو بگی fix/good؟
