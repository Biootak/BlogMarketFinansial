# Review — Site Density Reduction Round 2

**Verdict:** NEEDS_FIXES

## Summary
C.1 (globals.css tokens + container breakpoints), C.2 (CardLarge1), C.3 (card aspect ratios), C.4 (LatestArticles heading), and C.5 (skeletons) are all applied correctly and match the spec. The C.7 sweep, however, contains two regressions where the largest text size was dropped by two steps instead of one, and a third file where a non-largest size was incorrectly modified. TypeScript passes; lint noise is pre-existing and unrelated.

## Verification
- `npx tsc --noEmit`: PASS (exit 0)
- `npm run lint`: PASS for this change set (exit 0). 1596 errors / 177 warnings emitted, all pre-existing repo debt (none reference the Round 2 files' content; only match is a CRLF/LF line in `biome.json`).
- Protected paths touched in Round 2: NONE. `stat` timestamps confirm `dashboard/`, `middleware.ts`, `next.config.ts`, `prisma/`, `src/auth*`, `src/lib/auth.ts`, `src/actions/` were last modified 2026-06-23 or earlier; all 13 density files were modified 2026-06-24 14:16-14:20 during this round.

## Per-section spot checks

### C.1 globals.css: verified
Lines 212-220: all 9 `--fs-*` tokens match spec exactly (`--fs-base: 12px`, `--fs-sm: 10px`, `--fs-xs: 9px`, `--fs-lg: 13px`, `--fs-xl: 14px`, `--fs-2xl: 15px`, `--fs-3xl: 17px`, `--fs-4xl: 19px`, `--fs-5xl: 22px`).
Lines 343-345: container breakpoints at 1024/1280/1536 match spec (`max-width: 1080px/1180px/1280px`, padding-inline 1.25rem at lg).

### C.2 CardLarge1: verified
All 8 spec items present and correct:
- L58: `min-h-[260px] lg:min-h-[320px]`
- L76: `text-lg sm:text-xl lg:text-2xl font-bold ... leading-snug`
- L89: `text-sm ... leading-relaxed line-clamp-2` (no `lg:text-base`)
- L108: `sizeClass="h-9 w-9"`
- L128/L136: `w-9 h-9 ... hover:scale-105`
- L166: `aspect-[16/10] lg:aspect-[16/9] rounded-xl lg:rounded-2xl`
- L184: `w-12 h-12 lg:w-14 lg:h-14 shadow-xl`
- L198-199: decorative blobs at `w-16 h-16` / `w-20 h-20` (reduced).

### C.3 card aspect ratios: verified
- `Card10.tsx:29` → `aspect-[16/10] sm:aspect-[3/2]` ✓
- `Card10V3.tsx:74` → `aspect-[16/10] sm:aspect-[3/2]` ✓
- `Card11.tsx:22` → `'aspect-[16/10]'` (default param) ✓
- `Card2.tsx:41-42` → `aspect-[16/9] sm:aspect-[16/10] lg:aspect-[16/9]` and `aspect-[16/10] sm:aspect-[3/2]` (tighter than baseline) ✓
- `Card3Small.tsx:36` → `aspect-[16/10]` ✓
- `LatestArticles.tsx:700` → `aspect-[16/9]` ✓
- `AdCardStrip.tsx:321` → `aspect-[16/9]` ✓

### C.4 LatestArticles heading: verified
L368: `<h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight ...">` matches spec exactly.

### C.5 skeletons: verified
- `PulseSection.tsx:79` → `<Skeleton className="h-[360px] w-full rounded-3xl" />` (was 480) ✓
- `SectionMagazine1.tsx:102` → `<Skeleton className="h-[320px]" />` (was 400) ✓

### C.6 Design7: verified
No edits required; file already at smaller values.

### C.7 sweep: PARTIAL — 2 issues found in spot checks
Spec rule: "drop LARGEST only by ONE step". Spot-checked 4 files via `git diff`:
- `HeroSection.tsx:60` — was `text-2xl sm:text-4xl md:text-5xl lg:text-6xl` → now `... lg:text-5xl`. Only the largest (`lg:text-6xl`) dropped one step. ✓
- `FAQ.tsx:55` — was `text-2xl lg:text-4xl` → now `text-2xl lg:text-3xl`. Largest (`lg:text-4xl`) dropped one step. ✓
- `subscription/page.tsx:63` — **issue** (see below).
- `SingleHeader4.tsx:22` — **issue** (see below).

## Issues

1. **`src/app/(site)/(others)/subscription/page.tsx:63`** — `text-5xl` was dropped to `text-3xl` (two steps). Spec says drop the largest by ONE step only. The element had a single `text-5xl` (the largest in the file), so it should now be `text-4xl`, not `text-3xl`.
   - Suggested fix: change `text-3xl` back to `text-4xl` on line 63.

2. **`src/app/(site)/(singles)/SingleHeader4.tsx:22`** — two violations:
   - (a) The `mainClass` originally was `text-xl md:text-4xl md:!leading-[120%] lg:text-5xl 2xl:text-6xl`. The largest is `2xl:text-6xl`; per the spec rule "drop LARGEST only", `md:text-4xl` should have been left untouched. It was changed to `md:text-3xl`.
   - (b) `2xl:text-6xl` was dropped to `2xl:text-4xl` (two steps). It should be `2xl:text-5xl` (one step).
   - Current state: `text-xl md:text-3xl md:!leading-[120%] lg:text-4xl 2xl:text-4xl`.
   - Suggested fix: restore `md:text-4xl` (do not change it) and change `2xl:text-4xl` to `2xl:text-5xl`. Result should be: `text-xl md:text-4xl md:!leading-[120%] lg:text-4xl 2xl:text-5xl`.

## Notes
- The two issues above are both in the C.7 sweep, which covers 14 files. Only 4 were spot-checked; a full audit of the remaining 10 sweep files (e.g., `SectionMagazine2..9`, hero components, CTA components) is recommended before approving.
- Visual density delta from Round 1 to Round 2 looks correct for the files that passed (the verified components are noticeably tighter without collapsing to text-xs); the two failed files will read visually smaller than intended relative to the rest of the sweep.
- `tsc` and `lint` produce no new diagnostics attributable to Round 2; both failures are pure CSS-class value errors caught only by inspection.
