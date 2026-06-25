# Sidebar Redesign — Review

## Verdict
**NEEDS_FIXES**

## Mechanical checks
- tsc --noEmit: exit 0 — clean (no output)
- npm run lint: captured `lint_exit=0` is misleading (`$?` reflects `tail -10`, not `npm run lint`); actual lint output reports `Found 1621 errors`, `Found 177 warnings`, and explicitly states `Some errors were emitted while running checks`. Lint did NOT pass cleanly.
- raw oklch count: 0
- linear-gradient count: 0
- translate-x/hover:scale count: 0
- dash-side class references (component): 35
- dash-side CSS rules (globals.css): 51 (rules starting with `.dash-side`)
- new tokens declared (`^--ds-color-side\|^--ds-side-w-`): 0 — pattern returns zero matches (see Issue 3)
- diff stat:
  ```
   src/app/globals.css                                | 23792 ++++++++++---------
   src/components/Dashboard/DashboardPage/Sidebar.tsx |   434 +-
   2 files changed, 12239 insertions(+), 11987 deletions(-)
  ```

## API & data-state
- export default Sidebar: found (line 421)
- interface SidebarProps: found (line 58, with `userRole` at line 59)
- data-state attribute: found (line 323 — `<aside className="dash-side" data-state={dataState} aria-label="منوی داشبورد">`)
- style jsx block: 0

## Issues

### 1. Lint fails — 1621 errors / 177 warnings (BLOCKING)
- File: `src/app/globals.css`
- `npm run lint` reports `Found 1621 errors`, `Found 177 warnings`, and emits `× Some errors were emitted while running checks.`
- The `lint_exit=0` captured by the wrapper is an artifact of `2>&1 | tail -10; echo $?` — `$?` reflects `tail`, not `npm run lint`. Lint itself failed.
- Suggested fix: run `npm run lint 2>&1 | tail -1; echo $?` (or capture via `${PIPESTATUS[0]}`) to confirm the true exit code, then either pre-existing project lint debt must be baselined or new errors introduced by the rewrite must be resolved. If the 1621 errors are pre-existing, they are out of scope but must be acknowledged before approval.

### 2. Massive scope creep in `src/app/globals.css` (BLOCKING)
- File: `src/app/globals.css`
- Spec said "added ~225 lines of `.dash-side*` CSS + ~10 new tokens". Actual diff: `12239 insertions(+), 11987 deletions(-)` — roughly **12,000 lines added and 12,000 lines removed**.
- The file has been substantially rewritten, not appended to. This is the M2-failure pattern flagged in the reviewer prompt: unsolicited refactor / scope creep.
- Suggested fix: revert `globals.css` to its previous content and apply ONLY the ~225 lines of `.dash-side*` rules plus the ~10 new design tokens the spec authorises. If unrelated cleanup is desired, split it into a separate task/PR.

### 3. New design tokens not detected (BLOCKING)
- File: `src/app/globals.css`
- `grep -c "^--ds-color-side\|^--ds-side-w-"` returns 0 — no new `--ds-color-side-*` or `--ds-side-w-*` tokens found at column 0.
- The pattern anchors with `^`, which fails to match CSS custom properties that are indented (the common convention inside `:root { ... }`). Either the tokens are absent, or they exist only with leading whitespace and the grep query is mis-specified. Either way, the spec's "~10 new tokens" requirement is not verifiably satisfied by this run.
- Suggested fix: re-run with a non-anchored pattern, e.g. `grep -cE "\-\-ds-color-side|\-\-ds-side-w-" src/app/globals.css`. If the count is still ~0, the tokens were not actually added and the implementation is incomplete. If non-zero, update the grep in the verification script.

## Final
The component-level rewrite (`Sidebar.tsx`) cleanly preserves the public API (`export default`, `interface SidebarProps`, `userRole` prop, `data-state` attribute) and removes all anti-patterns (no `oklch`, `linear-gradient`, or `translate-x/hover:scale` in the component). However, the diff against `globals.css` is ~50x larger than the spec authorises (12k+ added vs ~225 expected) and lint emits 1621 errors, so this cannot ship until the `globals.css` scope is trimmed to the spec and the token/lint status is reconciled.
