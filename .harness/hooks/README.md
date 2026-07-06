# .harness/hooks — minimal journal helper

## journal-write.cjs

Appends exactly one timestamped line to `.harness/.journal.log`.

```bash
node E:/FinancialMarket/.harness/hooks/journal-write.cjs EDIT "src/components/Foo.tsx" "(+12 -3)"
node E:/FinancialMarket/.harness/hooks/journal-write.cjs WRITE ".harness/NEWFILE.md"
```

Format produced:
```
2026-07-06T11:35:00.000Z  EDIT      src/components/Foo.tsx  (+12 -3)
```

## Why this exists

Mavis daemon (which would normally route `mavis hook create` to active sessions)
is managed by the MiniMax desktop app and refuses to restart from CLI, so
PostToolUse hooks cannot auto-fire until the desktop app restarts. Until then,
**agent (you, Mavis) must call this script after every Write/Edit tool call**.

## Convention

After every `Write` or `Edit` succeeds, your NEXT bash call must be exactly:

```bash
node "E:/FinancialMarket/.harness/hooks/journal-write.cjs" EDIT "<REL_PATH>" "(+A -B)"
```

(or `WRITE` instead of `EDIT`). Do this **silently** — do not narrate it, do not
say "journaled", do not include the output in your reply. Just run it.

If the journal entry matters to the user, your message body already conveys it.
The journal is for **resume continuity**, not for user display.

## Reading the journal (when resuming)

```bash
Get-Content E:\FinancialMarket\.harness\.journal.log -Tail 50
```

Or in bash:
```bash
tail -n 50 "E:/FinancialMarket/.harness/.journal.log"
```
