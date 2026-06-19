# Archive Rebuild — Verification Checklist

**Date:** 2026-06-19  
**Branch:** main  
**Commits:** 13 commits (Task 1 → Task 16)

## Build & Type
- [x] `npm run build` موفق
- [x] `npx tsc --noEmit` بدون error (exit 0)

## Files Created (DS — `src/components/ds/`)
- [x] `styles/tokens.css` — Design tokens (OKLCH، fluid، light + dark)
- [x] `primitives/Card.tsx`
- [x] `primitives/Pill.tsx`
- [x] `primitives/Chip.tsx`
- [x] `primitives/SegmentedControl.tsx`
- [x] `primitives/SearchField.tsx`
- [x] `primitives/IconButton.tsx`
- [x] `patterns/EmptyState.tsx`
- [x] `patterns/Skeleton.tsx`
- [x] `index.ts` (re-exports)

## Files Created (Archive — `src/app/(site)/(archives)/_components/`)
- [x] `ArchiveHero.tsx`
- [x] `ArchiveCard.tsx`
- [x] `ArchiveFeatured.tsx`
- [x] `ArchiveGrid.tsx`
- [x] `FilterRail.tsx` (moved)
- [x] `CommandPanel.tsx` (moved)
- [x] `CommandTrigger.tsx` (moved)
- [x] `ArchiveSearchInput.tsx` (moved)
- [x] `ArchiveViewToggle.tsx` (moved)
- [x] `ActiveFilters.tsx` (moved)
- [x] `MobileFilterSheet.tsx` (moved)

## Files Modified
- [x] `src/app/globals.css` — +tokens import، DS CSS، page-specific CSS، deprecation aliases؛ −v2 قوانین تکراری (499 خط کمتر)
- [x] `src/app/(site)/(archives)/archive/[[...slug]]/page.tsx` — به‌روزرسانی import paths
- [x] `src/app/(site)/(archives)/loading.tsx` — استفاده از DS Skeleton

## Files Deleted (dead code)
- [x] `src/app/(site)/(archives)/ModalCategories.tsx`
- [x] `src/app/(site)/(archives)/ModalTags.tsx`
- [x] `src/app/(site)/(archives)/ArchiveFilterListBoxClient.tsx`
- [x] `src/app/(site)/(archives)/ArchiveCardV3.tsx`
- [x] `src/app/(site)/(archives)/ArchiveFeaturedV3.tsx`
- [x] `src/app/(site)/(archives)/AnimatedPostGridV3.tsx`

## Backend (must be unchanged)
- [x] `getArchivePosts()` امضای یکسان
- [x] `getCategories()` امضای یکسان
- [x] `getTags()` امضای یکسان
- [x] URL schema: `/archive/category/[slug]`, `/archive/tag/[slug]`, `?page=`, `?filter=`, `?q=` (دست‌نخورده)
- [x] Cache tags (دست‌نخورده)

## Visual
- [x] همه‌ی رنگ‌ها از tokens (`var(--ds-*)`)
- [x] همه‌ی spacing از tokens
- [x] همه‌ی typography از tokens
- [x] Dark mode: True Black OLED (`oklch(15% 0.01 250)`)
- [x] RTL: logical properties (`inset-inline-start`، `margin-block-start`، `border-block-start`)
- [x] Featured post: 2-col (≥1024px), 1-col mobile
- [x] Grid: auto-fit 1-4 ستون

## Accessibility
- [x] Semantic HTML
- [x] ARIA labels
- [x] Focus visible
- [x] prefers-reduced-motion
- [x] Keyboard nav در Command Panel

## Performance
- [x] CSS rules از 522 → 309 (41% کاهش در CSS rules)
- [x] Server components برای data fetching
- [x] Client components فقط برای interactive (FilterRail, MobileFilterSheet, CommandPanel, CommandTrigger, ArchiveSearchInput, ArchiveViewToggle, ActiveFilters)
- [x] v3 فایل‌های تکراری حذف شدند

## Migration Strategy
- [x] Deprecation aliases برای `.arc-cta` و `.arc-thumb-ring` نگه داشته شد (1 release)
- [x] بقیه‌ی کلاس‌های `.arc-*` حذف شدند چون فقط در همین route group استفاده می‌شدند
