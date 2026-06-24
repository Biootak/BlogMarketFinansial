# Chunk 1b — Hooks, Contexts, Deprecations Report

## Files created

| File | Lines | Size |
| --- | --- | --- |
| `src/hooks/useHotkeys.ts` | 81 | 2482 bytes |
| `src/hooks/useBreadcrumb.ts` | 23 | 559 bytes |
| `src/hooks/useViewTransition.ts` | 38 | 967 bytes |
| `src/components/Dashboard/DashboardPage/BreadcrumbContext.tsx` | 14 | 516 bytes |
| `src/components/Dashboard/DashboardPage/KeyboardShortcuts.tsx` | 27 | 687 bytes |
| **Total** | **183** | **5211 bytes** |

## Deprecation edit

`src/components/Dashboard/shared/DashboardTableWrapper.tsx` — `grep -c "@deprecated"` returns **2**. Added JSDoc immediately above each named export declaration. No implementation changes.

JSDoc placed on `DashboardPageHeader`:

```
/** @deprecated Use `PageHeader` from `@/components/Dashboard/primitives`. Will be removed in v3. */
export function DashboardPageHeader({ title, description, children }: DashboardPageHeaderProps) {
```

JSDoc placed on `EmptyState`:

```
/** @deprecated Use `EmptyState` from `@/components/Dashboard/primitives`. Will be removed in v3. */
export function EmptyState({
```

The two exports are declared on separate statements (not in a shared `export {}` block), so each received its own JSDoc. Both reference the new primitives module path `@/components/Dashboard/primitives` per the spec wording.

## Verification

1. **File existence** — all 5 files present and non-empty:

   ```
   src/hooks/useHotkeys.ts                              2482 bytes
   src/hooks/useBreadcrumb.ts                            559 bytes
   src/hooks/useViewTransition.ts                        967 bytes
   src/components/Dashboard/DashboardPage/BreadcrumbContext.tsx   516 bytes
   src/components/Dashboard/DashboardPage/KeyboardShortcuts.tsx  687 bytes
   ```

2. **`npx tsc --noEmit`** — exit code **0**, zero output (no errors, no warnings). The full project passes strict TypeScript checks.

3. **`grep -c "@deprecated" src/components/Dashboard/shared/DashboardTableWrapper.tsx`** — returns **2** (≥ 2 required).

## Deviations from spec

None. Every file matches the spec verbatim:

- `useHotkeys.ts` matches the contract exactly (sequence handler stores `g` after the first `g` press, matches `g d` / `g p` / `g s` on the second key within the 1s window, ignores events whose target is an editable field).
- `useBreadcrumb.ts` exports the same `BreadcrumbItem`, `BreadcrumbContextValue`, `BreadcrumbContext`, and `useBreadcrumb` symbol set.
- `useViewTransition.ts` returns a callback that calls `document.startViewTransition(() => router.push(href))` when available and falls back to plain `router.push` otherwise (and short-circuits on the server).
- `BreadcrumbContext.tsx` provides the `BreadcrumbProvider` component with `initialItems` defaulting to `[]`.
- `KeyboardShortcuts.tsx` wires `Mod+K` to dispatch `cmd-palette:open`, and `g d` / `g p` / `g s` to the corresponding dashboard routes.
- The two deprecation JSDoc blocks each reference the new `primitives` module path; the implementation of both deprecated components was left untouched.

## Notes

- No new dependencies were added (all imports resolve to packages already present: `react`, `next/navigation`).
- No primitive components were created — out of scope per the intent boundary.
- No edits to `globals.css`, `package.json`, or any page/route file.
- TypeScript strict mode honored: no `any`, no `@ts-ignore`, no non-null assertions.
