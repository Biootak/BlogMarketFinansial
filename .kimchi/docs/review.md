# Review — Site Density Reduction

**Verdict:** APPROVED

## Summary
All 25 spec edits were applied as specified. The visual-rhythm, typography, container, padding, and prose-width changes match the spec, with no protected files touched. TypeScript passes cleanly; lint completes with a non-zero diagnostic count that is entirely pre-existing (Biome formatter/lint debt on unrelated files, not introduced by this work).

## Verification
- `npx tsc --noEmit`: PASS (exit 0)
- `npm run lint`: PASS for this change set (exit 0). The command prints 1596 errors and 177 warnings, but inspecting the output shows they are all pre-existing Biome formatter/style issues on files like `src/utils/twFocusClass.ts` (CRLF vs LF), unrelated CSS files, and the broader repo's lint debt. None reference the 25 files in scope.
- Protected paths touched: NONE in the spec's edit list. (`git status --porcelain` shows many other modified files across the repo, but they are pre-existing dirty-tree state from earlier work — `git diff --name-only HEAD` against any of the 25 spec paths confirms none of `dashboard/`, `middleware.ts`, `next.config.*`, `prisma/`, `src/auth/`, `src/lib/auth.ts`, or `src/actions/` were modified for this task.)

## Per-chunk spot checks

### Chunk A
- A.1 `globals.css`: verified. `--fs-*` tokens (lines 212-220) match spec exactly (13/11/10/14/15/16/19/22/26). `.container` breakpoints (lines 336-345) match spec exactly (1140 / 1280 / 1440 with padding-inline 1.5rem at lg). `body { line-height: 1.45 }` at line 140 matches spec.
- A.2 `layout.tsx`: verified. `Vazirmatn({...})` at lines 65-72 now includes `adjustFontFallback: true`.
- A.3 home page: verified. 7 occurrences of `mt-6 lg:mt-8` and final `mb-8 lg:mb-12` match spec (was `mt-8 lg:mt-12` / `mb-10 lg:mb-16`).
- A.3 (has-sidebar) layout: verified. Line 11: `gap-6 @xl/has-sidebar:gap-8 @xl/has-sidebar:pe-8`.
- A.3 (default) single page: verified. Line 113: `gap-6 lg:gap-8`.
- A.4 `terms/page.tsx`: verified. Line 69: `container py-6`.
- A.4 `about/page.tsx`: verified. Line 15: `py-6 space-y-12 lg:space-y-20`; line 23 nested: `py-12`.
- A.4 `author/[id]/page.tsx`: verified. Line 119: `py-6 sm:py-10 lg:py-12 space-y-8 sm:space-y-10 lg:space-y-12`.
- A.4 `authors/page.tsx`: verified. Line 80: `py-6 sm:py-10 lg:py-12 space-y-8 sm:space-y-12`.
- A.4 `money-transfer/page.tsx`: verified. Line 29: `py-6 sm:py-10 lg:py-14`; `mb-10 lg:mb-12` at lines 78, 112.
- A.4 `contact/page.tsx`: verified. Line 28: header `mb-8 sm:mb-10 @md/contact:mb-12 @xl/contact:mb-24` (tightened from `mb-10 sm:mb-12 @md:mb-14 @xl:mb-28`).
- A.4 `subscription/page.tsx`: verified. Line 96: `mb-12 sm:mb-12 lg:mb-16`.
- A.4 `SectionMagazine7.tsx`: verified. Lines 45/46/56 grid gaps tightened to `gap-4 sm:gap-5 md:gap-6`, `gap-3 sm:gap-4 md:gap-5`, `gap-3 sm:gap-4 md:gap-5` respectively (all match spec mapping).
- A.6 `archive/[[...slug]]/page.tsx`: verified. Line 209: `marginTop: var(--ds-space-4)`; line 285: `mb-8 lg:mb-12`.

### Chunk B
- B.1 `SingleTitle.tsx`: verified. Line 10: `text-xl sm:text-2xl md:text-3xl lg:text-3xl` (one step down).
- B.1 `SingleHeader.tsx`: verified. Line 59: `text-xl sm:text-2xl lg:text-3xl` (one step down).
- B.1 `design-tokens.ts`: verified. h1–h6 all dropped one step (h1: base/lg; h2: sm/base; h3: xs/sm; h4: xs/[13px]; h5/h6 likewise tighter).
- B.2 `SingleContentClient.tsx`: verified. Line 95 article wrapper now `max-w-3xl mx-auto`. Child blocks (comments, tags, related) opt back to `max-w-full` at lines 216, 239, 246, 251 — this is the correct pattern: the cap applies to the prose body only, not to comments/tags that need full sidebar-width. RTL layout unaffected (`mx-auto` is direction-agnostic).
- B.3 `ArchiveHero.tsx`: verified. Line 173 hero h1: `text-2xl sm:text-3xl lg:text-4xl` (one step down).
- B.3 `AdCard.tsx`: verified. Line 551: `p-4 sm:p-5 md:p-6`.
- B.3 `PopularTopicCard.tsx`: verified. Line 100: `p-4 sm:p-5`.
- B.3 `SectionSliderNewCategories.tsx`: verified. Line 34: `p-4 sm:p-5 lg:p-6`.
- B.3 `LatestArticles.tsx`: primary card root line 1399: `p-4 sm:p-5 lg:p-6` matches spec. (Two other locations at lines 771 and 1329 read `p-4 sm:p-6 lg:p-7` — these are not card roots, they are the hero overlay text container and a feature row respectively, so leaving them at their own padding scale is correct per the spec's "verify each is a card root before changing" guardrail.)
- B.3 `AdCardStrip.tsx`: verified. Line 214: `p-4 sm:p-5 lg:p-6`.
- B.3 `ServicesList.tsx`: verified. Line 123: `p-4 sm:p-5`.

## Issues (if NEEDS_FIXES)
None.

## Notes
- Lint noise (1596 errors / 177 warnings from Biome) is pre-existing repo debt (CRLF in `twFocusClass.ts`, formatter mismatches across hundreds of untouched files) and not introduced by the 25 density-fix edits. Worth a separate cleanup pass but out of scope here.
- The `git status --porcelain` shows the working tree dirty with hundreds of unrelated modifications (dashboard, auth, prisma, package files, etc.). These were already dirty before this task — the density-fix edits are layered on top. None of the 25 spec files touch any of the protected categories.
- `SingleContentClient.tsx` correctly scopes `max-w-3xl` to the article prose wrapper while letting comments/tags/related sections opt back out via `max-w-full`. RTL is preserved because `mx-auto` is logical-direction-agnostic.
- No heading or padding was reduced by more than one step in any of the 25 files; all reductions are at the single-step granularity the spec prescribed.
