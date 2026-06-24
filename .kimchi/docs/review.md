# Dashboard Redesign 2026 — Spec Review

> Reviewer: code review sub-agent
> Date: 2026-06-24
> Spec: `/mnt/c/Users/Biotak/Desktop/FinancialMarket/Documents/DASHBOARD_REDESIGN_2026.md`
> Verdict: **NEEDS_FIXES** — see blockers below.

---

## 🚨 Blockers (must be fixed before building)

### B1. `<ViewTransition>` is not exported from React 19 — the spec hallucinates an API

- **Spec reference**: §4.3 ("Wrap the existing `.dash-scope` block in `<ViewTransition name="dash-page">`"), §7.3 ("Wrap each `<PageHeader>` with `view-transition-name: dash-page-{slug}` so route changes animate the title swap", "`startViewTransition()` from a `<Link>` wrapper or Next's `useRouter().push` with the transition API where supported").
- **Reality**: `node_modules/react@19.2.0` does **not** export a `<ViewTransition>` component. The string "viewTransition" only appears in internal React DOM suspense bookkeeping (`node_modules/react-dom/cjs/react-dom-client.development.js`, e.g. `suspendedViewTransitionReason`). There is no `unstable_ViewTransition`. Next.js 16.0.6 does not export one either (`grep -r "ViewTransition" node_modules/next/` returns nothing). The only working API is the browser-native `document.startViewTransition()` (Chrome 111+ / Edge).
- **Impact**: Chunk 2 and Chunk 3 cannot be implemented as written.
- **Fix**: Decide on one approach and amend the spec:
  - **Browser-only**: wrap router pushes in a `if (typeof document !== 'undefined' && 'startViewTransition' in document) document.startViewTransition(() => router.push(...))` helper. CSS does the rest via `@supports (view-transition-name: …)`.
  - **No React component**: delete the `<ViewTransition name="dash-page">` JSX wrapper from §4.3.
  - Also: the existing `globals.css:6469-6491` and `globals.css:7676-7678` already define a `dash-vt` view-transition pattern. Reuse it instead of inventing a new one.

### B2. `@radix-ui/react-direction` is a transitive dep, not declared in `package.json`

- **Spec reference**: §4.4.1 ("Wrap the entire tree in `<DirectionProvider dir="rtl">` from `@radix-ui/react-direction` (add to `package.json` if not present — verify first; if already there, reuse)").
- **Reality**: The package is resolvable (`node_modules/@radix-ui/react-direction@1.1.1`) and works via lockfile, but it is **not** in `package.json` `dependencies` — it is pulled in transitively by `@radix-ui/react-dropdown-menu`/`@radix-ui/react-popover`. Importing a transitive dep directly is fragile: a parent package dropping `@radix-ui/react-direction` from its `dependencies` (or bumping it) would silently break the dashboard.
- **Fix**: Add `"@radix-ui/react-direction": "^1.1.1"` to `dependencies` in `package.json` before Chunk 2 starts.

### B3. Chunk 3 file list is missing `WorkspaceToolbar.tsx`

- **Spec reference**: §11 Chunk 3 ("Home enhancements").
- **Reality**: The v2 directory contains **11 files**, not 9: `ActivityRail.tsx`, `AnalyticsCanvas.tsx`, `DashboardShell.tsx` (the orchestrator), `EngagementDonut.tsx`, `HeroSection.tsx`, `HeroSparkline.tsx`, `KpiGrid.tsx`, `PostsSpotlight.tsx`, `ScheduledRail.tsx`, `SystemHealth.tsx`, **`WorkspaceToolbar.tsx`**. The spec both misstates "9 subcomponents" in §1 and omits `WorkspaceToolbar.tsx` from Chunk 3's bullet list. The spec's own §5.6 references `.dash-minical` which lives inside `ScheduledRail.tsx` — fine — but `WorkspaceToolbar` is part of the home composition (`DashboardShell.tsx` line 41 imports it).
- **Fix**: Add `WorkspaceToolbar.tsx` to Chunk 3. Either (a) leave it untouched (it works), or (b) explicitly say "no changes". Same fix in §1's wording.

### B4. The `Toaster` and `Skeleton` primitives already exist

- **Spec reference**: §11 Chunk 1 ("`src/components/ui/toaster.tsx` (new — Radix Toast wrapper)", §3 "`Skeleton.tsx` … Replaces inline `dash-skeleton` for sub-routes").
- **Reality**:
  - `src/components/ui/toaster.tsx` already exists and is a working Radix Toast wrapper (uses `Toast`, `ToastClose`, `ToastProvider`, etc. from `@/components/ui/toast`).
  - `src/components/ui/skeleton.tsx` already exists (`function Skeleton({ className, ...props })` — a plain `div` with `animate-pulse rounded-md bg-muted`).
- **Impact**: Creating `primitives/Toaster.tsx` would shadow the import name in `index.ts`, and `primitives/Skeleton.tsx` would diverge from the shadcn primitive the rest of the codebase uses (`grep "from '@/components/ui/skeleton'"` is used in many files). Per the spec's own §13 risk row "Existing shadcn primitives not aligned with new `ds2-*` style → Don't replace shadcn — add `ds2-*` as an additive layer", this contradicts itself.
- **Fix**:
  - Remove the new `toaster.tsx` and `Skeleton.tsx` from Chunk 1. Re-export the existing ones from `primitives/index.ts` if a single import surface is desired.
  - Either delete `primitives/Skeleton.tsx` from §3's table OR keep it but make the spec explicit that it is **not** the shadcn one and explain the visual difference.

### B5. Bundle-size claim is unrealistic — donut chart is hand-rolled SVG, not the cost driver

- **Spec reference**: §10 ("First load JS … currently ~310 KB — net reduction by code-splitting the donut chart and removing the unused v1 imports in `MainContent`"), §12 acceptance ("Lighthouse Performance ≥ 95 on `/dashboard`").
- **Reality**:
  - `EngagementDonut.tsx` is 305 lines of hand-rolled SVG using only `react-icons/hi2` and `@/lib/motion-shim` (`grep` shows zero `recharts`/`chart.js`/`d3` imports). Code-splitting it would save **a few KB at most** — the SVG/JSX itself is small and the parent `DashboardShell` is already client-side.
  - The actual heavy imports on the home page are:
    - `recharts` (~150 KB raw, ~50 KB gzip) — used by `SystemReports.tsx` but that file is **only dynamically imported on `/dashboard/reports`**, not home. **Not the home cost.**
    - `chart.js` + `react-chartjs-2` (~80 KB gzip) — used by `TrafficChart.tsx` (v1 dead code, never imported by v2 — already excluded).
    - `Tiptap` (huge) — used by `PostForm` only, never imported by v2. **Not the home cost.**
    - `next-auth` provider (~10 KB gzip) and `@/lib/motion-shim` (re-exports `framer-motion`-like API) — likely the real drivers.
  - "Removing the unused v1 imports in `MainContent`": `MainContent.tsx` (56 lines) imports `motion`, `AnimatePresence`, `useSidebarStore`, `usePathname`. There are no v1 imports to remove. The "unused" claim is false.
- **Impact**: The 280 KB target is unfounded. Either find the real cost (bundle the current build with `ANALYZE=true` and read the output), or relax the budget. Lighthouse ≥ 95 is plausible for the home (mostly server-rendered, no charts, minimal client JS) but the budget number is fiction.
- **Fix**: Drop the specific "≤ 280 KB" figure and the "code-splitting the donut chart" rationale. Replace with: "Bundle the current home page with `@next/bundle-analyzer` or `npx next build --profile`, identify the top three contributors, and reduce each by at least 20% via dynamic import or replacement. Document the actual before/after numbers in the PR."

### B6. `RateEditorDrawer` and parser/editor chrome — spec over-claims the state of `rate-lists`

- **Spec reference**: §6.7 ("Replace the bespoke table with `DataTable`. Re-style the parser/editor drawer to use `ds2-card` chrome").
- **Reality**: `src/app/dashboard/rate-lists/page.tsx` **already** imports and uses the shared wrapper primitives: `DashboardPageHeader`, `DashboardSearchInput`, `DashboardTableContainer`, `DashboardTable`, `DashboardTableHeader`, `DashboardTableHead`, `DashboardTableBody`, `DashboardTableRow`, `DashboardTableCell`, `ActionButton`, `PrimaryActionButton`, `EmptyState`, `FilterSelect`. It is not "bespoke".
- **Impact**: Wasted work — Chunk 5 would re-style an already-styled page. The spec should call out which wrapper primitives to keep vs. swap to the new `DataTable`/`TableToolbar` from primitives.
- **Fix**: §6.7 should say: "Already uses `DashboardTableWrapper`. **Swap** the wrapper imports to the new `DataTable` + `TableToolbar` from primitives. Keep the action/dialog chrome."

### B7. `<DirectionProvider>` plus root `dir="rtl"` is redundant in some children, may need `<html dir>` check

- **Spec reference**: §4.4.1 wraps the whole dashboard in `<DirectionProvider dir="rtl">`.
- **Reality**: `src/app/dashboard/layout.tsx` already sets `dir="rtl"` on its outermost `<div>`. The `<html>` root already has `dir="rtl"` per `AGENTS.md`. Adding `<DirectionProvider dir="rtl">` is fine but is also already the default in Radix's `useDirection` for any subtree whose closest ancestor has `dir="rtl"` set.
- **Impact**: Not a blocker, but the spec doesn't say *where* in the tree to place it (provider order matters for `useRouter()`/`usePathname()` consumers like `Header.tsx` which calls `useSession()` — both `SessionProvider` ordering and `DirectionProvider` ordering must be above any consumer). Confirm by tracing consumer hooks.
- **Fix**: State explicitly that `<DirectionProvider dir="rtl">` must wrap `<Sidebar>`, `<Header>`, and `<MainContent>` because `Sidebar.tsx` uses `DropdownMenu` and `Header.tsx` will gain a `Popover` (notifications) and a `DropdownMenu` (user menu) — both rely on `useDirection`.

### B8. Spec contradicts itself on Settings tabs

- **Spec reference**: §6.5 ("The existing 6-tab bespoke UI is large. **Refactor**: keep all 6 tabs but rewrap them with `<PageHeader>` (title `تنظیمات`) and a tab strip using Radix `Tabs` (currently bespoke)").
- **Reality**: `src/app/dashboard/settings/page.tsx` (470 lines) is **bespoke** with custom buttons — confirmed. But `src/components/Dashboard/Settings/SystemSettings.tsx` (464 lines) **already uses** `Tabs, TabsContent, TabsList, TabsTrigger` from `@/components/ui/tabs`. The spec's §11 Chunk 6 lists `SystemSettings.tsx` as a file to touch in the Settings rewrite but never clarifies what to do with it (it's a dead/redundant file?). `src/app/dashboard/settings/page.tsx` does **not** import `SystemSettings.tsx` — it is a fully self-contained client component.
- **Impact**: A builder will likely either (a) edit both and create duplicate UI, or (b) miss `SystemSettings.tsx` and leave it as dead code that contradicts the spec's "use Radix Tabs" rule.
- **Fix**: §6.5 / Chunk 6 must explicitly say what to do with `SystemSettings.tsx`: either delete it, or rename it, or note it as dead code (matches the spec's "leave v1 dead code alone" rule for `DashboardPage/` but `SystemSettings.tsx` is not in that allow-list).

---

## ⚠️ Concerns (should be addressed but not blockers)

### C1. Many listed "Radix primitives to add" already exist

- **Spec reference**: §3 (DataTable, Breadcrumb, ConfirmDialog, FormField, MagneticButton, AmbientBackground, NoiseTexture, CountUp, etc.) and §4.4 ("Add a `<Toaster />` (Radix Toast) for optimistic-action confirmations").
- **Reality**: All Radix wrappers the spec implies are needed already exist in `src/components/ui/`: `dialog.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tabs.tsx`, `switch.tsx`, `toast.tsx`, `toaster.tsx`, `select.tsx`, `separator.tsx`, `scroll-area.tsx`, `tooltip.tsx`, `skeleton.tsx`, `alert.tsx`, `command.tsx`, `form-field.tsx`, `sheet.tsx`, `CustomSwitch.tsx`, `PersianDatePicker.tsx`, `date-range-picker.tsx`. The primitives layer should compose these rather than reimplement.
- **Recommendation**: State explicitly in §3 that every primitive should **wrap** the existing shadcn primitive (per the §13 risk rule "Existing shadcn primitives not aligned with new `ds2-*` style → Don't replace shadcn — add `ds2-*` as an additive layer"). `ConfirmDialog.tsx` should wrap the existing `Dialog` + `AlertDialog` import. `Tabs` should not be a new primitive — `Tabs` is already there.

### C2. Spec doesn't mention `posts/error.tsx` and `posts/loading.tsx`

- **Reality**: Both files exist (`src/app/dashboard/posts/error.tsx`, `src/app/dashboard/posts/loading.tsx`) and use bespoke chrome (`ButtonPrimary` from `@/components/Button/ButtonPrimary`, `PostsListSkeleton`).
- **Impact**: Builder will either touch them anyway or skip them silently. Either is fine but the spec should say which.
- **Fix**: Add a line to Chunk 4: "`src/app/dashboard/posts/error.tsx` — leave alone (uses old `ButtonPrimary`); `src/app/dashboard/posts/loading.tsx` — leave alone (already a `PostsListSkeleton`)." Same applies to the per-route `loading.tsx` files in every chunk.

### C3. The spec does not mention `SidebarInitializer.tsx`

- **Reality**: `src/components/Dashboard/DashboardPage/SidebarInitializer.tsx` is rendered in the layout (`layout.tsx:25`) and handles mobile detection. Any change to the sidebar's collapse behavior (§4.1.4 "animate `width` between `240px` ↔ `56px`") must coexist with `SidebarInitializer`'s `setIsMobile`/`setIsOpen` calls — otherwise the animated width change fights the resize handler.
- **Fix**: Add `SidebarInitializer.tsx` to Chunk 2 file list with a note "no behavior change; verify animated width doesn't conflict with `setIsOpen` toggles".

### C4. RTL icon-flipping guidance is partially wrong

- **Spec reference**: §9.2 ("Directional icons (`ArrowRight`, `ChevronRight`, `ArrowLeft`, `ChevronLeft`) get `rtl:scale-x-[-1]`. Diagonal icons (`ArrowUpRight`, `ArrowDownRight`) and static icons (`Search`, `Settings`, `User`, `Bell`, `MoreHorizontal`) do not flip").
- **Reality**: Per common RTL convention:
  - `ArrowRight` in RTL should display as pointing left (i.e. flip) — **correct**.
  - `ChevronLeft` and `ChevronRight` should flip — **correct**.
  - **But**: `ArrowUpRight` / `ArrowDownRight` are usually considered "static" (they point diagonally regardless of direction). However, a growing pattern (Linear, Vercel) treats ALL directional icons as flipping except `Up`/`Down` and the static set. Confirm the spec's intent.
  - **Critical**: the spec's custom variant `@custom-variant rtl (&:where([dir="rtl"], [dir="rtl"] *))` is fine, but **Tailwind v4 already ships an `rtl:` variant** when `@tailwindcss/postcss` is configured with the `dir="rtl"` ancestor (which the project does). Adding a second custom variant named `rtl` will produce a CSS conflict (duplicate `.rtl\:scale-x-\[-1\]:where([dir="rtl"], [dir="rtl"] *)` and `.rtl\:scale-x-\[-1\]:where([dir="rtl"], [dir="rtl"] *)` rules) — Tailwind will compile both and one will win non-deterministically.
- **Fix**: Drop the custom variant entirely. Use Tailwind v4's built-in `rtl:` variant (already available with `@tailwindcss/postcss@4.0.0`). Verify by writing a one-liner in a dev page that uses `rtl:hidden`.

### C5. `useSidebarStore` extension is underspecified

- **Spec reference**: §13 risk row "Existing `useSidebarStore` Zustand store conflict → Don't replace; extend the store with `setActiveHref` for the new active-rail indicator."
- **Reality**: `src/hooks/sidebarStore.ts` has only `isOpen`, `isMobile`, `setIsOpen`, `setIsMobile`. Adding `activeHref` + `setActiveHref` is fine, but:
  - The spec also adds `useSidebarStore` to multiple chunks (Chrome §4, sidebar §4.1.2) without specifying whether the type is backward-compatible. The store's interface change ripples into every component that destructures the store (`Header.tsx`, `Sidebar.tsx`, `MainContent.tsx`, `SidebarInitializer.tsx`).
  - "Active href" can also be derived from `usePathname()` directly — does the spec really need to add it to the store? `Sidebar.tsx` already calls `usePathname()` (line 6) for the same purpose.
- **Fix**: Either (a) drop the `setActiveHref` plan and use `usePathname()` like `Sidebar.tsx` already does, or (b) keep it but document the store shape change in §13.

### C6. The spec says "lucide-react which is already used in the project" — true in some places, false in v2

- **Reality**:
  - `lucide-react` is used in: `error.tsx` (AlertTriangle, RefreshCw, Home, WifiOff, ServerOff), `edit-profile/page.tsx` (User, Sparkles), `SystemReports.tsx` (Download, Users, etc.), `SystemLogsData.tsx` (AlertCircle, Info, etc.), `Settings` (Settings, Mail, Shield, etc.), `reports/page.tsx` (Activity, BarChart3, etc.). ~10+ files.
  - `react-icons/hi2` is used in **all 11 v2 files** plus `Sidebar.tsx` (13 icons), `Header.tsx` (3 icons), `PostHeader.tsx` (3 icons), `AdminPostListView.tsx` (~5 icons), `advertisements/page.tsx`, `users/page.tsx`, `rate-lists/page.tsx`, `FilterDropdown.tsx`, `CommandPalette.tsx`. **The v2 dashboard and all chrome use react-icons/hi2, not lucide.**
- **Impact**: §1 anti-pattern row says "❌ Emoji icons (use `lucide-react` which is already used in the project)". This contradicts §4.1 ("Don't rewrite — extend") and §4.2 ("extend"), which keep the existing `react-icons/hi2` imports. The spec never resolves this.
- **Fix**: Pick one and commit:
  - **Option A** (less churn): "Keep `react-icons/hi2` everywhere. Don't introduce `lucide-react` in new primitives." Then §1 anti-pattern row should read "use `lucide-react` or `react-icons/hi2` (both already used)".
  - **Option B** (more churn): "New primitives use `lucide-react`. Sidebar/Header keep `react-icons/hi2`. Accept the inconsistency." Then §1 anti-pattern row is correct as-is.

### C7. Spec uses `Float` button styling that conflicts with the design language

- **Spec reference**: §1 anti-pattern "❌ `rounded-full` primary buttons" but §3 `MagneticButton.tsx` is described as "Pointer-magnet button" without specifying shape.
- **Reality**: The design language is in `Documents/2026_DASHBOARD_DESIGN_LANGUAGE.md`. The anti-pattern list in §1 is sourced from there. Confirm `MagneticButton` does NOT default to `rounded-full` — the §2.4 component layer says `.ds2-btn--primary` should be one of `xs/sm/md/lg` (h-7/h-8/h-9/h-10), implying rounded-rect, not pill.
- **Fix**: State explicitly in §3 that `MagneticButton.tsx` wraps the existing `Button` (shadcn) and does NOT change its shape.

### C8. `unstable_noStore` import in `categories/page.tsx` is from `next/cache`, not `next/navigation`

- **Reality**: Not a spec issue, but Chunk 5's "don't modify server actions" rule is fine; just noting that categories uses `unstable_noStore as noStore` (already deprecated alias for `connection()` in Next 16). No spec change needed; flag for the Chunk 5 builder.

### C9. v2 components import from `@/lib/motion-shim`

- **Reality**: Every v2 component imports `motion, AnimatePresence` from `@/lib/motion-shim`. Spec §7 introduces `MagneticButton`, `AmbientBackground` etc. as new micro-interactions. These new primitives will either need to use the same shim (and re-implement the `pointermove` listener on top of it) or break the project's animation convention.
- **Fix**: Specify in §3 that `MagneticButton` does NOT use `motion-shim` — it's plain DOM with a `pointermove` listener — and explain why (magnetic effect requires direct DOM control).

---

## 💡 Suggestions (improvements)

### S1. Add a `/dashboard/_components/PageHeaderSSR.tsx` server-component variant

`Breadcrumb.tsx` is listed as a server component in §3. But `PageHeader.tsx` is implicitly client (it accepts `actions` JSX, which may include client components). Either mark the Breadcrumb-only path as the SSR boundary or accept that `PageHeader` is always client. Clarifying this avoids a hydration mismatch.

### S2. The spec's `dash2-pageheader` and existing `DashboardPageHeader` from `DashboardTableWrapper.tsx` will diverge

`DashboardTableWrapper.tsx` already exports `DashboardPageHeader` (used by `categories/page.tsx`, `users/page.tsx`, `rate-lists/page.tsx`). Adding `PageHeader` to primitives creates a parallel API. Consider deprecating `DashboardPageHeader` and migrating all 3 sites to the new `PageHeader` in the same Chunk that introduces it.

### S3. `EmptyState` already exists in `DashboardTableWrapper.tsx`

Same as S2: 2 `EmptyState` components with different APIs. Pick one and migrate.

### S4. Persian number formatting in `<StatCard>` value

The spec says `<CountUp>` uses `Intl.NumberFormat('fa-IR')` (which the existing `CountUp.tsx` already does). Make this explicit in the `<StatCard>` API: `format?: 'persian' | 'latin' | 'compact' | 'percent'` instead of relying on `CountUp`'s built-in default.

### S5. Consider running `npx next build --profile` and committing the bundle map BEFORE writing code

The 310 KB → 280 KB claim (§10) is unverifiable without a baseline. The spec author should produce this number (run a build, look at `.next/analyze/` or use `@next/bundle-analyzer`) before the budget is locked in. Otherwise Chunk 3/4 builders will optimize blindly.

### S6. Document the `Skeleton` API contract

Existing `src/components/ui/skeleton.tsx` is a single div with `animate-pulse rounded-md bg-muted`. The spec's `Skeleton` primitive should extend it (e.g., `<Skeleton variant="text|card|avatar|row" lines={n} />`) rather than parallel-implement.

### S7. Tiptap styling inside `ds2-card`

The risk row "Tiptap editor styling inside new `ds2-card` wrapper" mentions "scoped CSS in the editor wrapper". Spec §6.2 mentions "side panel uses `ds2-card`" but the editor itself is inside `PostForm`, not the side panel. Clarify: is the editor inside a `ds2-card`, or only the metadata panel? `PostForm` already provides its own chrome (`dash-panel`-like).

### S8. Accessibility — focus order through `<Breadcrumb>` + `<PageHeader>` actions

Spec §8.4 ("Touch targets: 40×40px minimum") but the §3 `PageHeader` "actions slot" could contain small icon buttons. Add to §3: "PageHeader `actions` slot enforces `min-h-10 min-w-10` (40px) on icon buttons, with explicit `aria-label`."

### S9. `TableToolbar` density persistence

Spec §3 says "Density persisted in localStorage." Confirm the key namespace (e.g., `dash2:density`) to avoid colliding with any existing localStorage key.

### S10. Add a "what to do if Tailwind v4 doesn't recognize `dash2-` utilities"

The spec assumes Tailwind v4 will pick up `.dash2-*` classes declared in `@layer utilities`. v4 only compiles classes it sees in source. Add a one-line sanity check: "After appending the utilities, grep the bundle for `dash2-page` — if missing, the file wasn't picked up by `@layer utilities`."

---

## ✅ Confirmed (paths exist, assumptions hold)

### Files & directories verified

| Path | Status |
|---|---|
| `src/app/globals.css` (8812 lines) | Exists. `Dashboard 2026 (June 22)` block at lines 7078–7729 confirmed (exact spec match). |
| `src/components/Dashboard/DashboardPage/Sidebar.tsx` (455 lines) | Exists. Uses `react-icons/hi2` (13 icons). Imports `useSidebarStore`. |
| `src/components/Dashboard/DashboardPage/Header.tsx` (173 lines) | Exists. Uses `SwitchDarkMode` (not Radix Switch). |
| `src/components/Dashboard/DashboardPage/MainContent.tsx` (56 lines) | Exists. Already wraps in `.dash-scope dash-grid-texture`. No `ViewTransition` wrapper. |
| `src/app/dashboard/layout.tsx` (38 lines) | Exists. No `DirectionProvider`/`Toaster`/`KeyboardShortcuts` yet — Chunk 2 is clean. |
| `src/components/Dashboard/shared/DashboardTableWrapper.tsx` (330 lines) | Exists. Exports `DashboardPageHeader`, `DashboardSearchInput`, `DashboardTableContainer`, `DashboardTable`, `DashboardTableHeader`, `DashboardTableHead`, `DashboardTableBody`, `DashboardTableRow`, `DashboardTableCell`, `StatusBadge`, `ActionButton`, `PrimaryActionButton`, `EmptyState`, `FilterSelect`. |
| `src/components/Dashboard/Blog/AdminPostListView.tsx` | Exists. Renders `PostHeader` + `PostList` + `SkeletonLoader` + `ErrorComponent`. |
| `src/app/dashboard/posts/page.tsx`, `create/page.tsx`, `edit/[postId]/page.tsx` | All exist. |
| `src/app/dashboard/posts/error.tsx`, `loading.tsx` | Both exist (not in Chunk 4 — see C2). |
| `src/app/dashboard/users/page.tsx` | Exists. Already uses `DashboardTableWrapper` primitives + Radix Dialog/Form. |
| `src/app/dashboard/categories/page.tsx` | Exists. Uses `DashboardPageHeader` from the shared wrapper, `SearchCategories`, `CategoryForm`, `CategoryList`. |
| `src/app/dashboard/settings/page.tsx` (470 lines) | Exists. 6 bespoke tabs (general/email/security/social/database/advanced). Confirms spec §6.5. |
| `src/app/dashboard/settings/loading.tsx` | Exists (uses `SettingsPageSkeleton`). |
| `src/app/dashboard/exchange-rates/page.tsx` + 9 files in `_components/` | All exist (`DiscoveryCommand`, `ExchangeRateRow`, `ExchangeRatesHeader`, `ExchangeRatesTable`, `ExchangeRatesToolbar`, `ExchangeRatesWorkspace`, `RateEditorDrawer`, `SourceBadge`, `ValueCell`). Matches spec "9 children". |
| `src/app/dashboard/advertisements/page.tsx` | Exists (single-file page, no `_components/` subdir). |
| `src/app/dashboard/header-ad/page.tsx` + `HeaderAdsClient.tsx` | Both exist. |
| `src/app/dashboard/rate-lists/page.tsx` | Exists. **Already uses** `DashboardTableWrapper` primitives (see B6). |
| `src/app/dashboard/reports/page.tsx` + `ActivityLogsData.tsx` + `SystemLogsData.tsx` | All exist (the two `*Data.tsx` files are in `src/app/dashboard/reports/`, not in `src/components/Dashboard/Reports/` — spec chunk 5 has the right path). |
| `src/app/dashboard/service-requests/page.tsx` | Exists. Uses `ServiceRequestsTable` + `ServiceRequestsStats`. |
| `src/app/dashboard/edit-profile/page.tsx` | Exists. Already Persian. Has a decorative card with `dash-panel` — spec description is accurate. |
| `src/app/dashboard/billing-address/page.tsx` | Exists. **In English** with old `Input`/`Select`/`Label` from `@/components/Input/...` (not shadcn). |
| `src/app/dashboard/subscription/page.tsx` | Exists. **In English** with hardcoded mock data. Confirms spec's "placeholder" claim. |
| `src/app/dashboard/loading.tsx`, `error.tsx` | Both exist. `error.tsx` is already well-styled (uses `lucide-react`, `Button`, friendly error classifier). |
| `src/app/dashboard/page.tsx` | Exists. Promise.all of **6 server actions**: `getStats`, `getScheduledPosts`, `getPopularPosts`, `getRecentDrafts`, `getViewStats`, `getRecentActivity`. Spec claim verified. |
| `src/components/Dashboard/DashboardPage/v2/` — 11 files | All exist (DashboardShell + 10 subcomponents). See B3 for the file-count discrepancy. |
| `src/components/Dashboard/DashboardPage/CountUp.tsx` | Exists at the expected path. Already uses `Intl.NumberFormat('fa-IR')`, respects `prefers-reduced-motion`. Spec's "already exists — re-export from primitives" is correct. |
| `src/components/Dashboard/DashboardPage/CommandPalette.tsx` | Exists. Already responds to `⌘K` (the spec's "command-K pill button" can hook into it via `window.dispatchEvent(new CustomEvent('cmd-palette:open'))` which the existing code supports). |
| `src/components/ui/` shadcn primitives | All Radix-based primitives the spec implies are needed are present: `dialog.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tabs.tsx`, `switch.tsx`, `toast.tsx`, `toaster.tsx`, `select.tsx`, `skeleton.tsx`, `form-field.tsx`, `sheet.tsx`, `CustomSwitch.tsx`, `command.tsx`, etc. |

### Hooks & store verified

| Path | Status |
|---|---|
| `src/hooks/sidebarStore.ts` | Exists. Zustand. Currently `{ isOpen, isMobile, setIsOpen, setIsMobile }`. Extension with `activeHref` + `setActiveHref` is safe (see C5 for caveat). |
| `src/hooks/useHotkeys.ts` | **Does not exist.** Safe to create. |
| `src/hooks/useBreadcrumb.ts` | **Does not exist.** Safe to create. |
| `src/components/Dashboard/DashboardPage/BreadcrumbContext.tsx` | **Does not exist.** Safe to create. |
| `src/components/Dashboard/DashboardPage/KeyboardShortcuts.tsx` | **Does not exist.** Safe to create. |
| `src/components/Dashboard/primitives/` directory | **Does not exist.** Safe to create. |
| `useSidebarStore` consumers | `Header.tsx`, `Sidebar.tsx`, `MainContent.tsx`, `SidebarInitializer.tsx` — all use `setIsOpen` and `setIsMobile` (compatible with extension). |

### Token / class prefix collisions verified

| Search | Result |
|---|---|
| `grep "dash2-" src/app/globals.css` | **0 matches.** Safe to add the `dash2-` namespace. |
| `grep "ds-color-canvas\|ds-color-surface\|ds-radius-sm\|ds-radius-md" src/app/globals.css` | **0 matches.** Safe to add `--ds-color-*` and `--ds-radius-*` tokens. |
| `grep "ds-color-canvas" src/app/globals.css` | 0 matches. (The existing tokens use the `ds-` prefix with `ds-stat-card` etc. but no `--ds-color-canvas`, `--ds-color-surface`, `--ds-color-fg-muted` as defined in §2.1.) |
| `find src -name "AmbientBackground*" -o -name "NoiseTexture*"` | **None.** Safe to create (Chunk 3 lists them as new). |

### Package dependencies verified

| Package | In `package.json` | Notes |
|---|---|---|
| `@radix-ui/react-direction` | **No** (only transitive, see B2) | Need to add as direct dep. |
| `@radix-ui/react-toast` | **Yes** (`^1.2.4`) | Reuse existing `toaster.tsx`. |
| `@radix-ui/react-tabs` | **Yes** (`^1.1.2`) | Reuse `tabs.tsx`. |
| `@radix-ui/react-popover` | **Yes** (`^1.1.4`) | For Header notifications bell. |
| `@radix-ui/react-dropdown-menu` | **Yes** (`^2.1.4`) | For Sidebar workspace switcher + Header user menu. |
| `@radix-ui/react-switch` | **Yes** (`^1.1.2`) | For theme toggle. |
| `@radix-ui/react-dialog` | **Yes** (`^1.1.4`) | For ConfirmDialog primitive. |
| `cmdk` | **Yes** (`^1.0.4`) | Already used by `CommandPalette.tsx`. |
| `lucide-react` | **Yes** (`^0.469.0`) | See C6 — used in some places, NOT in v2. |
| `next-themes` | **Yes** (`^0.4.6`) | For theme persistence. |
| `next` | **Yes** (`^16.0.0`, actual `16.0.6`) | Confirmed. |
| `react` | **Yes** (`^19.0.0`, actual `19.2.0`) | Confirmed. **No `<ViewTransition>` export** (B1). |
| `zustand` | **Yes** (`^5.0.2`) | For sidebar store. |
| `tailwindcss` | **Yes** (`^4.0.0`) | v4. |

### Infrastructure verified

- `npm run dev` → `next dev --webpack` (matches AGENTS.md and Turbopack panic warning)
- `npm run build` → `next build` (no `next.config.ts` `output: 'standalone'` flag conflicts)
- `npm run lint` → `biome check .` (per `package.json`, NOT `next lint` — AGENTS.md says "ESLint" but the script is actually biome; spec's `npm run lint` passes will run biome, which is fine since biome enforces `noExplicitAny` and `dangerouslySetInnerHTML` errors as the AGENTS.md requires)
- `npx tsc --noEmit` → no script, will be invoked ad-hoc (matches AGENTS.md)

---

## Summary

The spec is detailed and the file paths mostly check out. The blockers concentrate in three places:

1. **B1** (hallucinated `<ViewTransition>` API) — must be rewritten.
2. **B4** (duplicate primitives) — `Toaster` and `Skeleton` already exist.
3. **B5** (unrealistic bundle-size claim) — needs a real baseline.

Plus **B3** (missing `WorkspaceToolbar` in Chunk 3), **B6** (rate-lists already uses shared wrapper), and **B8** (Settings duplicate `SystemSettings.tsx` not addressed).

The concerns are mostly documentation/policy gaps (C1, C4, C5, C6) that a careful builder would resolve but a hasty one would not.
