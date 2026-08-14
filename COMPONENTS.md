# COMPONENTS.md — Component Manifest (system.md)

> Load with `DESIGN.md` before choosing or creating any UI component.
> Answers for each component: What is it · When use · When NOT use · Required states.
> Goal: stop the agent from inventing its own button/card/modal.

## Canonical system
- **Primary:** `src/components/ui/*` (shadcn/Radix). Anchor on `button`, `input`, `dialog`, `card`, `skeleton`.
- **Dashboard:** `src/components/Dashboard/primitives/*` (`EmptyState`, `StatCard`, `DataTable`, `FormField`, …).
- **`ds` set is experimental/unused** — do NOT route new code to `src/components/ds/*` (except Archive/ExchangeRatesToolbar where already adopted). Prefer `ui/*` equivalents.

## Decision protocol (every new element)
1. Search the repo for an existing component with the same purpose.
2. Reuse → extend (variant) → compose primitives → new shared → page-specific.
3. Never create a new component just because an existing one has a different name.

## Components

### Button — `ui/button.tsx` (31 uses)
- **Use:** every action. Variants default/secondary/ghost/outline/destructive + sizes.
- **NOT use:** `ds/IconButton` (unused) — for icon-only use `ui/button size="icon"`.
- **States:** default / hover / active / disabled / loading (focus ring + spinner) / focus-visible.

### Input — `ui/input.tsx` (17 uses)
- **Use:** text entry. Pair with `ui/label` + `ui/form`.
- **NOT use:** `ds/SearchField` (unused) — for search use `ui/input` + a form.
- **States:** default / focus / disabled / error (invalid aria) / readonly.

### Dialog — `ui/dialog.tsx` (16 uses)
- **Use:** modal surfaces (forms, confirm, detail). Radix = focus trap + Esc + scroll lock.
- **NOT use:** bespoke `Modal*` / `*Drawer` / `*Dialog` copies — consolidate, don't add. Prefer `ui/dialog` or `ui/sheet` (side panel).
- **2026-08-14:** `NcModal` (headlessui) حذف شد — ModalHideAuthor ×۲ و ModalReportItem به `ui/dialog` مهاجرت کردند. CommentCard + PostForm dialogs از قبل `ui/dialog` بودند.
- **States:** open / close (animation) / focus-trap / Esc / backdrop-click / loading submit / error.

### Card — `ui/card.tsx` (6 uses)
- **Use:** content container (Card/Header/Title/Content).
- **NOT use:** `ds/primitives/Card` (rare, redundant); legacy `Card*` directories (Card3Small/Card6/…) — keep only where already rendered, do NOT create new.
- **States:** hover (subtle) / selected / loading.

### Skeleton — `ui/skeleton.tsx` (13 uses)
- **Use:** loading placeholders. `Dashboard/primitives/Skeleton` just re-exports it.
- **NOT use:** `ds/patterns/Skeleton` (unused).
- **Required:** matches final layout dimensions.

### EmptyState — `Dashboard/primitives/EmptyState.tsx`
- **Use:** empty lists/tables/sections. Props icon/title/description/action.
- **NOT use:** `ds/patterns/EmptyState`, `Dashboard/shared/DashboardTableWrapper.EmptyState` (@deprecated), or inline local `EmptyState` — there are 5 copies; this is canonical.
- **States:** with / without action.

### StatCard — `Dashboard/primitives/StatCard.tsx`
- **Use:** KPI/metric tiles (dashboard). `ui/stat-card` is an unused stub — don't use.
- **States:** loading / value / up-down trend color.

### DataTable — `Dashboard/primitives/DataTable.tsx` (generic `<T>`)
- **Use:** dashboard data tables.
- **NOT use:** `Dashboard/shared/DashboardTableWrapper` (@deprecated `PageHeader`) — migrate to `DataTable` + `Dashboard/primitives.PageHeader`.
- **States:** loading / empty / selected row / bulk action / error.

### Badge / Chip — `ui/badge.tsx`
- **Use:** status/eyebrow tags. `ds/Chip` / `ds/Pill` are unused duplicates.
- **States:** default / accent / active / removable.

### Tabs / Segmented — `ui/tabs.tsx` (Radix)
- **Use:** in-page view switching. `ds/SegmentedControl` (1 use) — keep only where adopted.
- **States:** active / keyboard arrow nav / disabled.

### Select / DropdownMenu / Popover / Sheet / Tooltip / Switch
- **Use** the `ui/*` Radix versions. (CustomSwitch حذف شد 2026-08-14 — از `ui/switch` استفاده کنید.)
- **Switch states:** on / off / disabled / focus.

### Date pickers (CONSOLIDATE — currently 4 overlapping)
`ui/PersianDatePicker`, `ui/PersianDateTimePicker`, `ui/date-range-picker`, `ui/calendar`. Pick ONE canonical before documenting; until then reuse the one already used in the target page.

## Forbidden to create (duplicates that already exist)
New `Button` / `Card` / `Modal` / `Dialog` / `EmptyState` / `Skeleton` / `Input` / `Table` / `Badge`. New global CSS classes for these. New `ModalHideAuthor`-style stubs (handlers must do real work).

## Required states (every interactive/container component)
loading · empty · error · disabled · success/active · keyboard focus-visible · reduced-motion-safe.
