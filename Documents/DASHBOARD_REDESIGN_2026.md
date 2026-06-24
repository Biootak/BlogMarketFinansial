# Dashboard UI/UX Redesign — 2026

> **Scope**: Frontend-only redesign of `/dashboard/*` in `blogmarketfinansial.ir`. Back-end actions and Prisma schema untouched.
> **Inspiration**: Resend console (chrome, micro-UX), Linear (tables, density, command-K), Vercel observability (KPI tiles, charts), Stripe Sigma (finance-grade table), Notion (sidebar), Polar.sh / Dub.co (page-header pattern).
> **Stack**: Next.js 16 App Router + Tailwind v4 + Radix UI + Vazirmatn (RTL Persian).
> **Hard rules**: WCAG 2.2 AA · full RTL Persian · logical CSS properties · `prefers-reduced-motion` honored · TypeScript strict · production-ready (no placeholders).

---

## 1. Constraints & non-goals

### In scope
- Every route under `src/app/dashboard/**`.
- The shared chrome (`Sidebar`, `Header`, `MainContent`, `dashboard/layout.tsx`).
- The v2 home dashboard orchestrator and its 9 subcomponents.
- The shared table primitives (`src/components/Dashboard/shared/`).
- Global CSS additions in `src/app/globals.css` (extend the existing `Dashboard 2026 (June 22)` block, do NOT replace).
- New shared primitives under `src/components/Dashboard/primitives/` (additive, no rewrites of unrelated files).

### Out of scope (for this redesign)
- Public marketing pages (`src/app/(site)/**`).
- Auth surface (`/login`, `/signup`) — already redesigned in `globals.css` "AUTH SURFACE" block.
- Server actions, Prisma schema, API routes (frontend may consume them; do not modify).
- Tailwind config files (Tailwind v4 reads tokens from `@theme` in `globals.css` — extend there).
- i18n / locale switching.
- Removing v1 dead code in `DashboardPage/` (e.g. `DashboardPage.tsx`, `KpiBento.tsx`, `WelcomeSection/`). **Leave them alone** — user said "don't delete what isn't needed yet".

### Anti-patterns to reject (from `Documents/2026_DASHBOARD_DESIGN_LANGUAGE.md`)
- ❌ `backdrop-filter: blur` on cards (top-bar + command-K only).
- ❌ `rounded-full` primary buttons (use `rounded-md` / `rounded-lg` only).
- ❌ Centered spinners as the only loading state (skeletons instead).
- ❌ Color-only status badges (icon + text + color always).
- ❌ `outline: none` without replacement.
- ❌ `pl-/pr-/ml-/mr-/left-/right-` (logical properties only).
- ❌ `transition-all` (always list the properties).
- ❌ Emoji icons (use `lucide-react` or `react-icons/hi2` — both already in the project).
- ❌ `next dev --turbopack` — keep `npm run dev` (webpack) per AGENTS.md.
- ❌ Duplicate primitives (don't recreate `Toaster`, `Skeleton`, `Dialog`, `Tabs`, etc. that already exist in `src/components/ui/`).

### Icon-library policy
The v2 dashboard chrome (`Sidebar`, `Header`, all 11 files in `v2/`) uses **`react-icons/hi2`** (HiOutline2 family). Other parts of the codebase (`error.tsx`, `edit-profile/page.tsx`, `Settings/*`, `reports/*`) use **`lucide-react`**. **Decision: keep `react-icons/hi2` in v2 chrome; new primitives built for the redesign use `lucide-react`.** Document the inconsistency in code comments — it's acceptable for a transition period. Future cleanup PR may unify.

---

## 2. Design tokens (extend `globals.css` `@theme` block)

Append these tokens to the existing `@theme { ... }` block in `src/app/globals.css` (do not duplicate existing `--ds-*` vars — extend with new `--ds-*` tokens and new Tailwind v4 utility classes).

### 2.1 New semantic tokens
```css
--ds-color-canvas:        oklch(98.5% 0.004 245);
--ds-color-canvas-dark:   oklch(15% 0.018 255);
--ds-color-surface:       oklch(100% 0 0);
--ds-color-surface-dark:  oklch(20% 0.018 255);
--ds-color-surface-2:     oklch(96% 0.004 245);
--ds-color-surface-2-dark:oklch(24% 0.018 255);
--ds-color-border-subtle: oklch(92% 0.006 245);
--ds-color-border-subtle-dark: oklch(28% 0.02 255);
--ds-color-fg-muted:      oklch(45% 0.01 245);
--ds-color-fg-muted-dark: oklch(70% 0.01 245);
--ds-color-fg-subtle:     oklch(55% 0.01 245);
--ds-color-fg-subtle-dark:oklch(55% 0.012 250);

--ds-radius-sm: 6px;
--ds-radius-md: 8px;
--ds-radius-lg: 12px;
--ds-radius-xl: 16px;
--ds-radius-2xl: 20px;

--ds-duration-fast:  120ms;
--ds-duration-base:  200ms;
--ds-duration-slow:  320ms;
--ds-ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);
--ds-ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 2.2 New Tailwind v4 utilities (append to existing `@layer utilities` block)
Add **after** the "Dashboard 2026 (June 22)" block. Use the `dash2-` prefix (not `dash-`) to avoid colliding with the v1 utilities.

| Utility | Purpose |
|---|---|
| `.dash2-page` | Page container: `mx-auto max-w-[1600px] px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-5 lg:py-8 space-y-4 sm:space-y-6` |
| `.dash2-pageheader` | Editorial page header: padded header with breadcrumb + title + actions slot |
| `.dash2-pageheader__crumbs` | Breadcrumb row, `text-xs text-muted-foreground` |
| `.dash2-pageheader__title` | `text-2xl sm:text-3xl font-bold tracking-tight` |
| `.dash2-pageheader__sub` | `text-sm text-muted-foreground` |
| `.dash2-pageheader__actions` | Slot for buttons, `ms-auto flex items-center gap-2` |
| `.dash2-statcard` | KPI card (label + big number + change + sparkline) |
| `.dash2-statcard__value` | `text-3xl font-semibold tracking-tight tabular-nums` |
| `.dash2-statcard__delta` | Change pill with icon + color |
| `.dash2-statcard__spark` | 8-wide × 24-tall sparkline container |
| `.dash2-table` | Linear-style table container: `rounded-xl border border-border-subtle overflow-hidden` |
| `.dash2-table__head` | Sticky header: `bg-canvas/80 backdrop-blur text-xs uppercase tracking-wider text-fg-muted` |
| `.dash2-table__row` | `h-9 hover:bg-surface-2 transition-colors duration-fast` (comfortable variant: `h-11`) |
| `.dash2-table__cell` | `ps-3 pe-3 text-sm` |
| `.dash2-toolbar` | Page-level toolbar (above tables): search + density + actions |
| `.dash2-ambient` | Ambient gradient drift background (used on home hero only) |
| `.dash2-noise` | SVG noise overlay (`opacity: 0.025; mix-blend-mode: overlay; pointer-events: none`) |
| `.dash2-skeleton` | Skeleton shimmer block (replaces `dash-skeleton` on sub-routes for consistency) |
| `.dash2-focus-ring` | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500` (composable via `@apply`-like class) |
| `.dash2-empty` | Empty state with centered icon + title + description + optional CTA |
| `.dash2-section` | Section wrapper: `space-y-3 sm:space-y-4` |

### 2.3 RTL variant — use the built-in
**Do NOT** declare `@custom-variant rtl`. Tailwind v4 (`@tailwindcss/postcss@4.0.0`) already ships a built-in `rtl:` variant when an ancestor has `dir="rtl"`. The `<html dir="rtl">` is set globally on this project, so `rtl:scale-x-[-1]`, `rtl:flex-row-reverse`, etc. work out of the box. Adding a custom variant named `rtl` would compile to a duplicate rule and cause non-deterministic override behavior.

### 2.4 Component layer (additive)
Append a single `@layer components { ... }` block at the bottom of `globals.css` (next to the existing "AUTH SURFACE" block) containing shared button/input/badge classes:
- `.ds2-btn` (base), `.ds2-btn--primary`, `.ds2-btn--secondary`, `.ds2-btn--ghost`, `.ds2-btn--danger` with xs/sm/md/lg sizes (h-7 / h-8 / h-9 / h-10).
- `.ds2-input`, `.ds2-textarea`, `.ds2-select` (matching heights, focus ring, disabled state).
- `.ds2-badge`, `.ds2-badge--success/warning/danger/info/neutral` (icon + color pair).
- `.ds2-card`, `.ds2-card--hover`.

These let every sub-route drop in the same component layer without prop drilling shadcn.

---

## 3. New shared primitives (additive — `src/components/Dashboard/primitives/`)

Each file ≤ 200 lines. Client components unless noted. Full RTL + a11y built in.

| File | Purpose | Key props | Notes |
|---|---|---|---|
| `PageHeader.tsx` | Unified page header | `breadcrumb[]`, `title`, `description?`, `actions?`, `eyebrow?` | Used by EVERY sub-route. Polar/Dub pattern. |
| `StatCard.tsx` | Vercel KPI tile | `label`, `value`, `delta?`, `trend? ('up'\|'down')`, `spark?`, `icon?`, `href?`, `info?` | Optional href makes the whole card a Next `<Link>`. |
| `StatGrid.tsx` | Responsive grid of StatCards | `cols?: 2\|3\|4\|5\|6`, `gap?`, `children` | Wraps with CSS container queries. |
| `DataTable.tsx` | Linear-style table | `columns[]`, `rows[]`, `density?`, `stickyHeader?`, `selectable?`, `empty?`, `loading?` | Generic over `T`. |
| `TableToolbar.tsx` | Search + density + bulk actions | `search?`, `onSearch?`, `density?`, `onDensityChange?`, `actions?` | Density persisted in localStorage. |
| `Section.tsx` | Section wrapper | `title?`, `description?`, `actions?`, `children` | The "card row" pattern. |
| `EmptyState.tsx` | Empty state | `icon`, `title`, `description?`, `action?` | Polar-style. |
| `Skeleton.tsx` | Skeleton primitive | `variant?: 'text'\|'card'\|'avatar'\|'row'`, `lines?: number`, `className?` | **Wraps** the existing `src/components/ui/skeleton.tsx` (shadcn). Adds variant API. |
| `Breadcrumb.tsx` | Breadcrumb nav | `items: { href?, label }[]` | **Server component**. `aria-label="مسیر"`. |
| `MagneticButton.tsx` | Pointer-magnet button | `as` ButtonProps, `magnetRange?: number = 6`, `children` | Used ONLY for the hero primary CTA on dashboard home. **Rounded-rect only** (`rounded-md` / `rounded-lg`, NEVER `rounded-full`). Honors reduced motion. Plain DOM with a `pointermove` listener — does NOT use `@/lib/motion-shim` (magnetic effect requires direct DOM control). |
| `AmbientBackground.tsx` | Drifting gradient mesh | `colors?: string[]`, `intensity?` | Fixed `inset-0 -z-10` element with 3 radial gradients animating on a 40s loop. |
| `NoiseTexture.tsx` | SVG noise overlay | `opacity?`, `blend?` | 2-3% opacity over hero/empty states. |
| `CountUp.tsx` | Animated count-up | `value`, `duration?`, `format?` | Used in StatCard values. Already exists at `DashboardPage/CountUp.tsx` — re-export from primitives with the same name to avoid duplication. |
| `ConfirmDialog.tsx` | Generic confirm modal | `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `onConfirm`, `variant?` | **Wraps** the existing `@/components/ui/dialog` + `AlertDialog`. |
| `FormField.tsx` | Label + input + error | `label`, `error?`, `hint?`, `children` | Pairs with shadcn inputs. |
| `index.ts` | Barrel re-export | — | |

**Zero behavior change** to existing pages during primitive creation. The primitives are added first; pages are migrated afterward.

### 3.1 Re-exports (do not duplicate)
These primitives **wrap** existing shadcn/Radix wrappers in `src/components/ui/`. Do not create parallel implementations:
- `primitives/Toaster.tsx` → **re-export** `@/components/ui/toaster` (already a working Radix Toast wrapper).
- `primitives/Skeleton.tsx` → wrap `@/components/ui/skeleton` with a `variant` prop API.
- `primitives/ConfirmDialog.tsx` → wrap `@/components/ui/dialog` + Radix `AlertDialog`.
- `primitives/EmptyState.tsx` → replaces the duplicate in `DashboardTableWrapper.tsx` (mark old as deprecated, do not delete — the spec forbids deletion).
- `primitives/PageHeader.tsx` → replaces `DashboardTableWrapper.DashboardPageHeader` (mark old as deprecated).

### 3.2 SSR boundary
- `Breadcrumb.tsx` is a server component.
- `PageHeader.tsx` is a **client component** (the `actions` slot may render interactive controls).
- All other primitives are client components (Radix wrappers, motion hooks).
- `MagneticButton.tsx`, `AmbientBackground.tsx`, `NoiseTexture.tsx` are client components with `'use client';`.

### 3.3 PageHeader actions slot contract
- Icon buttons in the `actions` slot must enforce `min-h-10 min-w-10` (40×40px touch target) and have explicit `aria-label` when icon-only.
- If an action is a `<Button>` with visible text, the shadcn default heights (`h-8` / `h-9` / `h-10`) apply.

### 3.4 StatCard number formatting
`StatCard` exposes `format?: 'persian' | 'latin' | 'compact' | 'percent'` to control `Intl.NumberFormat` locale and grouping. Default = `'persian'` (fa-IR).

### 3.5 localStorage key namespace
All primitives that persist state to localStorage use the `dash2:` prefix (e.g. `dash2:density`, `dash2:posts-filter`, `dash2:theme`). Avoid collisions with the existing `sidebar-store` Zustand localStorage hydration.

### 3.6 Tailwind v4 sanity check
After appending `.dash2-*` utilities to `@layer utilities`, run `npx next build` and grep `.next/static/css/*.css` for `dash2-page` — if missing, the CSS file wasn't picked up (likely an unbalanced `@layer utilities { ... }` block).

---

## 4. Chrome redesign (Sidebar, Header, MainContent, layout)

### 4.1 Sidebar (`src/components/Dashboard/DashboardPage/Sidebar.tsx`)
**Don't rewrite — extend.** Wrap the existing role-gated menu items with these 2026 enhancements:

1. **Add a workspace switcher** at the top (sticky `48px` row above the menu). Even if there's only one workspace, render a `selectable` UI placeholder labeled `وبلاگ اصلی` (so it looks intentional). Use Radix `DropdownMenu` (already in `src/components/ui/dropdown-menu.tsx`).
2. **Active route indicator**: keep deriving the active href from `usePathname()` (already in use at `Sidebar.tsx:6`). Replace the simple active background with a `2px` inline-start rail (RTL-safe) using a gradient from `oklch(72% 0.13 210)` → `oklch(72% 0.14 165)`. Use `inset-inline-start`.
3. **Hover state**: `bg-surface-2` for 120ms ease-out-expo. No scale transform.
4. **Collapse transition**: animate `width` between `240px` ↔ `56px` with `var(--ds-ease-out-expo)` over `var(--ds-duration-slow)`. **Coordinate with `SidebarInitializer.tsx`** (`src/components/Dashboard/DashboardPage/SidebarInitializer.tsx`) — it calls `setIsMobile` on resize and `setIsOpen` on initial mount. The animated width change must NOT fight those store updates; if `isMobile === true`, the sidebar renders as full-screen overlay (mobile behavior unchanged).
5. **Add a tiny `kbd` hint** next to each item's icon when expanded (e.g. `⌘1`, `⌘2`) — bound to `useHotkeys` (a new tiny hook in `src/hooks/useHotkeys.ts`).
6. **Footer**: keep the existing user/role block but wrap with a `ds2-card` style and add a subtle top border.
7. **Mobile**: full-screen overlay with a slide-in from the inline-start edge (300ms ease-out-expo).

**Do NOT add `activeHref` / `setActiveHref` to `src/hooks/sidebarStore.ts`** — `usePathname()` already provides this; duplicating it in the Zustand store creates a stale-state risk. The store stays `{ isOpen, isMobile, setIsOpen, setIsMobile }`.

### 4.2 Header (`src/components/Dashboard/DashboardPage/Header.tsx`)
**Don't rewrite — extend.**

1. Add a **command-K pill button** (`Cmd K` chip) on the start side (in RTL: visual right) — opens the existing `CommandPalette`.
2. **Breadcrumb slot** in the center (consumed via a new `BreadcrumbContext` provider so the page itself sets it). Default = page title from `usePathname()`.
3. **Notifications bell** → wrap in a Radix `Popover` with an unread dot indicator (red pulse, `dash-livedot` already exists — reuse).
4. **Theme toggle** → keep but switch the visual to a Radix `Switch` with a spring transition (200ms cubic-bezier spring). Persist in `localStorage` via existing `next-themes`.
5. **User avatar popup** → wrap in Radix `DropdownMenu`, add a "View profile" link.
6. **Top bar height**: `56px` (`h-14`) with `bg-background/80 backdrop-blur border-b border-border-subtle`. Sticky `inset-block-start: 0`.

### 4.3 MainContent (`src/components/Dashboard/DashboardPage/MainContent.tsx`)
**Don't rewrite — extend.**

1. Add a `<BreadcrumbContext.Provider>` here so any descendant page can call `useBreadcrumb()`.
2. **Cross-route transitions**: the existing `globals.css:6469-6491` and `globals.css:7676-7678` already define a `dash-vt` view-transition pattern. **Do NOT use the React `<ViewTransition>` component — it does not exist in React 19.2.0.** Use the **browser-native `document.startViewTransition(callback)`** via a small helper in `src/hooks/useViewTransition.ts`:
   ```ts
   'use client';
   import { useRouter } from 'next/navigation';

   export function useViewTransition() {
     const router = useRouter();
     return (href: string) => {
       if (typeof document === 'undefined' || !('startViewTransition' in document)) {
         router.push(href);
         return;
       }
       (document as any).startViewTransition(() => {
         router.push(href);
       });
     };
   }
   ```
   `<PageHeader>` and `<Link>` wrappers that opt into transitions call `useViewTransition().(href)` instead of plain `router.push`. CSS handles the animation via `@supports (view-transition-name: …)` gates. Pages opt in by passing `transition="default"` to `<PageHeader>`.
3. Add an `<AmbientBackground />` slot at the bottom of the layout for the home route only.

### 4.4 `src/app/dashboard/layout.tsx`
**Don't rewrite — minor patch.**

1. **Add `@radix-ui/react-direction` to `package.json` `dependencies`** (`^1.1.1`). The package currently exists as a transitive dep of `@radix-ui/react-dropdown-menu`/`@radix-ui/react-popover`; importing a transitive dep directly is fragile. After the `package.json` change, run `npm install`.
2. Wrap the entire tree in `<DirectionProvider dir="rtl">` from `@radix-ui/react-direction`. **Placement is critical**: `<DirectionProvider>` must wrap `<Sidebar>`, `<Header>`, and `<MainContent>` (and anything inside them) because `Sidebar.tsx` uses `DropdownMenu` and `Header.tsx` will gain a `Popover` (notifications) and `DropdownMenu` (user menu) — both rely on `useDirection()`. The `<html dir="rtl">` root already provides the default; this provider is explicit and belt-and-suspenders.
3. Add a `<Toaster />` (the existing `@/components/ui/toaster` re-exported via `primitives/Toaster`) for optimistic-action confirmations.
4. Add a global `<KeyboardShortcuts />` client component for `⌘K` (open palette), `g d` (go to dashboard), `g p` (go to posts), `g s` (go to settings). All routed via `useRouter()`. `<KeyboardShortcuts>` renders nothing visible.

---

## 5. Dashboard home (`/dashboard`) — enhance, don't rewrite

The v2 home (`DashboardShell` + 9 subcomponents, lines 7078–7729 of `globals.css`) is already excellent. Apply targeted enhancements:

### 5.1 Hero
- **Magnetic primary CTA** (new post button) — bind to `MagneticButton` primitive. Magnetism range ±6px. Honors reduced motion.
- **Noise overlay** at 2.5% on the hero background.
- **Headline typewriter / word reveal** on first mount (300ms each, stagger 40ms). Honors reduced motion.
- **Sparkline**: animate stroke-dashoffset on mount (600ms ease-out-expo). Reuse `HeroSparkline.tsx` — extend its `<path>` to add `stroke-dasharray`/`stroke-dashoffset` + a `requestAnimationFrame` reveal.

### 5.2 KPI Grid
- **Count-up animation** on values on mount and on range-chip change. Reuse the new `CountUp` from primitives.
- **Sparklines**: same stroke-dashoffset reveal as hero.
- **Trend pill**: when delta is positive → emerald with `ArrowUpRight`; negative → rose with `ArrowDownRight`. Always paired icon + text + color (a11y §1.4.1).

### 5.3 Engagement Donut
- Already range-aware. **Add** an animated `stroke-dasharray` reveal on mount (each slice delayed 80ms).
- **Hover state**: scale 1.04 + brighten the hovered slice color via `color-mix(in oklch, var(--slice-color), white 12%)`.

### 5.4 Activity Rail
- **Day-grouped** (already done). Add a subtle **vertical timeline rail** (`1px` line) connecting items within a day group, with a dot at each item.

### 5.5 Analytics Canvas
- Tabs already use view transitions. **Extend** the chart mount animation (bars: `scaleY 0→1` from baseline, staggered 20ms; lines: stroke-dashoffset reveal).

### 5.6 Scheduled Rail (right column)
- **Mini-calendar** already exists (`.dash-minical`). **Add** a hover state to `.dash-minical__cell--has` that lifts the dot 1px.
- **Add** a `aria-label` per cell describing how many posts are scheduled that day.

### 5.7 System Health (right column)
- Already polished. Add a **tiny inline chart** (last 24h ping) inside each row using a 12-bar sparkline.

### 5.8 Posts Spotlight
- Add a **pill filter** (all / popular / drafts) at the top using `.dash2-chip`. Persist in `localStorage`.

---

## 6. Sub-route redesigns

For every sub-route, the new pattern is:
```tsx
<PageHeader
  breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: '...' }]}
  title="..."
  description="..."
  actions={<Button>...</Button>}
/>
<Section>...content...</Section>
```

### 6.1 `/dashboard/posts` (delegates to `AdminPostListView`)
- Add a `<PageHeader>` above the existing list view with title `پست‌ها` + description `مدیریت پست‌های وبلاگ` + a primary action `ایجاد پست جدید` (links to `/dashboard/posts/create`).
- Replace the legacy filter dropdown with the new `TableToolbar` (search, status filter, density toggle).
- Use the new `DataTable` primitive for the post list (keep `AdminPostListView` intact, but re-style its outer chrome).

### 6.2 `/dashboard/posts/create` + `/dashboard/posts/edit/[postId]`
- Add a `<PageHeader>` with breadcrumb (Posts → Create / Edit) + back button.
- Wrap the editor in a `<Section>` with two columns on `lg`: editor (flex-1) + side panel (sticky metadata: status, categories, tags, SEO).
- The side panel uses `ds2-card` with sticky `top-20`.

### 6.3 `/dashboard/categories`
- Use `<PageHeader>` + `<TableToolbar>` (search already exists as `SearchCategories` — wrap it). Use `DataTable` for the list. Keep the existing `EditCategoryDialog` and `CategoryForm` — just re-style their chrome.

### 6.4 `/dashboard/users`
- Same pattern. Wrap the existing `users/page.tsx` client component with `<PageHeader>` and re-style its modal/dialog chrome using `ds2-btn`/`ds2-input`.
- Use `DataTable` for the list view (replace the existing table).

### 6.5 `/dashboard/settings`
- The existing 6-tab bespoke UI is large. **Refactor**: keep all 6 tabs but rewrap them with `<PageHeader>` (title `تنظیمات`) and a tab strip using the **existing** Radix `Tabs` from `@/components/ui/tabs` (currently bespoke buttons — replace those with `<TabsList>`/`<TabsTrigger>`). Use `ds2-card` for each section panel.
- **Also note**: `src/components/Dashboard/Settings/SystemSettings.tsx` (464 lines, dead/redundant — **not imported** by `settings/page.tsx`) already uses Radix Tabs. **Do not modify `SystemSettings.tsx`** — it is dead code per the spec's "leave v1 dead code alone" rule. `src/components/Dashboard/Settings/SocialLinksManager.tsx` IS imported and should be re-styled (outer chrome only).

### 6.6 `/dashboard/exchange-rates`
- The existing `_components/` workspace is already well-structured. Add `<PageHeader>` (title `نرخ ارزها`, breadcrumb `داشبورد / نرخ ارزها`, action `افزودن نرخ`). Re-style `ExchangeRatesTable` rows to use `DataTable` row markup.
- Add a **live "synced N seconds ago" indicator** with a pulsing dot (`dash-livedot`) above the table — reuse the cron sync state from the server action.

### 6.7 `/dashboard/rate-lists`
- Already uses `DashboardTableWrapper` primitives (`DashboardPageHeader`, `DashboardSearchInput`, `DashboardTableContainer`, etc.). **Swap** the wrapper imports to the new `DataTable` + `TableToolbar` from primitives. Keep the action/dialog chrome (`RateEditorDrawer`, parser UI) — re-style its outer chrome to use `ds2-card`.

### 6.8 `/dashboard/advertisements`
- Add `<PageHeader>` (title `تبلیغات`). Re-style the table to use `DataTable`. Replace the bespoke create/edit form chrome with `ds2-btn`/`ds2-input`/`FormField`.

### 6.9 `/dashboard/header-ad`
- Wrap with `<PageHeader>`. Re-style `HeaderAdsClient`.

### 6.10 `/dashboard/reports`
- Add `<PageHeader>` (title `گزارش‌ها`). Re-style the existing tabs (SystemReports / ActivityLog / SystemLogs) with `ds2-card` panels.
- The `dynamic()` imports stay — they save bundle size.

### 6.11 `/dashboard/service-requests`
- Already has a good layout. Wrap with `<PageHeader>`. Use `DataTable` for `ServiceRequestsTable`.

### 6.12 `/dashboard/edit-profile`
- Already wraps `ProfileForm` in a decorative card. Replace the decorative glass card with a `ds2-card` and add `<PageHeader>` (title `ویرایش پروفایل`).

### 6.13 `/dashboard/billing-address`
- Static page. Add `<PageHeader>` (title `آدرس صورتحساب`). Re-style inputs with `ds2-input`.

### 6.14 `/dashboard/subscription`
- Static placeholder. Replace with a "Coming soon" `EmptyState` that uses the new primitive + add `<PageHeader>` (title `اشتراک`). The user explicitly said "don't delete what isn't needed" — but this page IS the placeholder, so leave the page but improve its chrome.

### 6.15 Loading & error boundaries
- `src/app/dashboard/loading.tsx` — keep but extend with a unified skeleton using `<Skeleton>` primitive.
- `src/app/dashboard/error.tsx` — re-style the existing error boundary chrome with `ds2-card` and a clean Retry button.

---

## 7. Micro-interactions (apply across the whole dashboard)

### 7.1 Ambient background drift
Single fixed-position `<AmbientBackground />` rendered in `MainContent.tsx` (hidden on home where the hero owns the visual):
```css
@keyframes dash2-drift {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  33%  { transform: translate3d(-2%, 1%, 0) scale(1.05); }
  66%  { transform: translate3d(1%, -1%, 0) scale(1.03); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}
```
Three radial-gradient blobs (blue / violet / cyan) drifting on a 40s loop. Respects reduced motion (pauses animation).

### 7.2 Noise texture
Inline SVG (`feTurbulence baseFrequency=0.9`) at 2.5% opacity, `mix-blend-mode: overlay`, on hero + empty states + auth surface.

### 7.3 View Transitions
- Wrap each `<PageHeader>` with `view-transition-name: dash-page-{slug}` so route changes animate the title swap.
- Use `startViewTransition()` from a `<Link>` wrapper or Next's `useRouter().push` with the transition API where supported.

### 7.4 Magnetic primary CTAs
- Single instance per page: the hero's primary action.
- `pointermove` listener with max ±6px translate.
- Reduced-motion → no listener.

### 7.5 Skeletons (replace all spinners for loads > 200ms)
- `<Skeleton className="h-4 w-32" />` for text lines.
- `<Skeleton className="h-32 w-full rounded-xl" />` for cards.
- `<Skeleton className="h-9 w-full" />` for table rows (3–8 of them).

### 7.6 Optimistic UI
- For `createUser`, `updateUser`, `deleteUser`, `createCategory`, `deletePost` — wrap with `useOptimistic` (React 19) or SWR's `mutate({revalidate: false})`. UI updates immediately, server reconciles.
- Toast on success / failure via the new Radix `<Toaster />`.

---

## 8. Accessibility (WCAG 2.2 AA) — apply to every new component

1. **Skip link** on every page (re-use `.dash-skip` pattern in the new `dash2-` namespace).
2. **Focus ring**: 2px outline, 2px offset, color = `--ds-color-blue` (separate from any accent).
3. **Live regions**: Toast viewport with `aria-live="polite"` + `aria-atomic="true"`. Form errors via `aria-describedby` on inputs + a polite region summary at the top.
4. **Touch targets**: 40×40px minimum for icon buttons (32×32 only inside dense tables where the row itself is clickable).
5. **Keyboard**: Tab order follows visual order. Radix primitives handle roving tabindex. `Esc` closes menus / dialogs. `Enter` submits forms.
6. **Color is not the only signal**: every status indicator pairs color with text or icon.
7. **Reduced motion**: `prefers-reduced-motion: reduce` collapses all animations to 0.001ms; the magnetic CTA listener is gated.

---

## 9. RTL (Persian) hard rules

1. Every new component uses logical properties only (`ps-`, `pe-`, `ms-`, `me-`, `border-s`, `border-e`, `start-*`, `end-*`, `inset-s`, `inset-e`).
2. Directional icons (`ArrowRight`, `ChevronRight`, `ArrowLeft`, `ChevronLeft`) get `rtl:scale-x-[-1]`. Diagonal icons (`ArrowUpRight`, `ArrowDownRight`) and static icons (`Search`, `Settings`, `User`, `Bell`, `MoreHorizontal`) do not flip.
3. Persian numerals for prices/counts via `Intl.NumberFormat('fa-IR')`. Latin IDs/timestamps use `font-mono tabular-nums` and stay Latin.
4. Numbers in inputs use `inputMode="decimal"` with manual Persian numeral conversion (avoid `<input type="number">`).
5. `<html dir="rtl" lang="fa-IR">` — already set at root. Verify nothing regresses.
6. `<DirectionProvider dir="rtl">` wraps Radix primitives that use `align="start"|"end"` for auto-flip.

---

## 10. Performance budget

Performance targets are real and verifiable, but specific bundle-size claims require a measured baseline.

### 10.1 Targets (verifiable via Lighthouse / DevTools)
- **Lighthouse Performance** ≥ 90 on `/dashboard` (mobile, simulated 4G). The page is server-rendered with a small client bundle, so this is achievable.
- **LCP** ≤ 2.0s on 4G. Hero LCP is the headline + sparkline; both render in the initial server response.
- **CLS** ≤ 0.05. All panes have explicit `contain-intrinsic-size`.
- **TTI** ≤ 2.5s on 4G. Sub-route `dynamic({ ssr: false })` for the chart wrappers (already done in `reports/page.tsx`).
- **Lighthouse Accessibility** = 100 on every dashboard route (WCAG 2.2 AA target).

### 10.2 Bundle-size baseline (must measure, not assume)
**Before writing any chunk**, run:
```bash
npx next build --profile
```
or with `@next/bundle-analyzer` (already a transitive dep — confirm and wire up if needed). Inspect `.next/analyze/client.html` (or the analyzer output) and record the **actual** top three contributors to the home page's client JS. The real cost drivers in v2 are likely `motion-shim` (which re-exports framer-motion-style API), the `react-icons/hi2` bundle (consider per-icon imports), and `next-auth`/`zustand` bootup. Do **not** assume the cost is in `EngagementDonut` — that file is 305 lines of hand-rolled SVG using zero chart libraries and code-splitting it would save a few KB at most.

### 10.3 Fonts & images
- Vazirmatn Variable via `next/font/google`. Verify `display: swap` and `preload` are set (already done in the root layout per AGENTS.md).
- All hero / post images go through `next/image` with `sizes` set. Verify in `posts/page.tsx` and `PostsSpotlight.tsx`.

---

## 11. Build chunks (parallelizable)

The implementation is split into 6 chunks. Each chunk is a self-contained builder task with a clear verify command. Chunks 3–6 can run in parallel after chunks 1 + 2 complete.

### Chunk 1 — Foundation (must run first)
**Files**:
- `src/app/globals.css` (append new tokens, utilities, components, **do NOT add `@custom-variant rtl`**)
- `src/components/Dashboard/primitives/` (15 files per §3, **Toaster and Skeleton re-export or wrap existing components**, not new files)
- `src/hooks/useHotkeys.ts` (new)
- `src/hooks/useBreadcrumb.ts` (new — context + hook)
- `src/hooks/useViewTransition.ts` (new — `useViewTransition()` helper for cross-route transitions, §4.3.2)
- `src/components/Dashboard/DashboardPage/BreadcrumbContext.tsx` (new)
- `src/components/Dashboard/DashboardPage/KeyboardShortcuts.tsx` (new)
- `src/components/Dashboard/primitives/index.ts` (barrel)
- Mark `src/components/Dashboard/shared/DashboardTableWrapper.tsx::DashboardPageHeader` and `::EmptyState` as `@deprecated` (do NOT delete — the spec forbids deletion of unrelated files; sites can be migrated later).

**Verify**: `npx tsc --noEmit` passes. No runtime regressions because nothing references the new primitives yet. `npx next build --profile` succeeds and emits a client bundle.

### Chunk 2 — Chrome (depends on chunk 1)
**Files**:
- `package.json` (add `"@radix-ui/react-direction": "^1.1.1"` to `dependencies`)
- `src/components/Dashboard/DashboardPage/Sidebar.tsx` (extend — workspace switcher, active rail, hover, kbd hints, footer polish)
- `src/components/Dashboard/DashboardPage/Header.tsx` (extend — command-K pill, breadcrumb slot, notifications Popover, theme Switch spring, user DropdownMenu)
- `src/components/Dashboard/DashboardPage/SidebarInitializer.tsx` (verify — **no behavior change**; confirm animated `width` doesn't conflict with `setIsMobile`/`setIsOpen` toggles)
- `src/components/Dashboard/DashboardPage/MainContent.tsx` (extend — BreadcrumbContext.Provider, view-transition helper integration)
- `src/app/dashboard/layout.tsx` (patch — `<DirectionProvider>` wraps `<Sidebar>`/`<Header>`/`<MainContent>`, `<Toaster>` added, `<KeyboardShortcuts>` mounted)

**Verify**: `npm run lint` passes. `npx tsc --noEmit` passes. `npm install` succeeds (the new `@radix-ui/react-direction` direct dep). Dev server boots; sidebar collapses; command-K opens palette; theme toggle persists.

### Chunk 3 — Home enhancements (depends on chunk 1)
**Files** (v2 directory contains 11 files = `DashboardShell` + 10 subcomponents):
- `src/components/Dashboard/DashboardPage/v2/DashboardShell.tsx` (extend — view-transition integration, optional ambient background slot)
- `src/components/Dashboard/DashboardPage/v2/HeroSection.tsx` (magnetic CTA + noise overlay + headline word reveal)
- `src/components/Dashboard/DashboardPage/v2/HeroSparkline.tsx` (animated stroke-dashoffset reveal)
- `src/components/Dashboard/DashboardPage/v2/WorkspaceToolbar.tsx` (no functional change; verify density toggle persistence uses `dash2:density` localStorage key — was `dashboard:density` or similar before; coordinate)
- `src/components/Dashboard/DashboardPage/v2/KpiGrid.tsx` (count-up + animated sparklines)
- `src/components/Dashboard/DashboardPage/v2/EngagementDonut.tsx` (animated slice reveal + hover brighten)
- `src/components/Dashboard/DashboardPage/v2/ActivityRail.tsx` (timeline rail between items)
- `src/components/Dashboard/DashboardPage/v2/AnalyticsCanvas.tsx` (animated bars/lines; the existing `dash-vt` view-transition CSS is already wired — leave it)
- `src/components/Dashboard/DashboardPage/v2/ScheduledRail.tsx` (cell aria-label, hover dot lift)
- `src/components/Dashboard/DashboardPage/v2/SystemHealth.tsx` (inline 12-bar mini sparkline per row)
- `src/components/Dashboard/DashboardPage/v2/PostsSpotlight.tsx` (filter pill at top, persisted in `dash2:posts-filter`)
- `src/components/Dashboard/DashboardPage/v2/AmbientBackground.tsx` (new)
- `src/components/Dashboard/DashboardPage/v2/NoiseTexture.tsx` (new)

**Verify**: Dev server renders `/dashboard`. Every pane animates on mount. Reduced-motion users see static panes (no animation, no magnetic CTA). `npx tsc --noEmit` passes. `npx next build` succeeds.

### Chunk 4 — Posts + content management (depends on chunk 1)
**Files**:
- `src/app/dashboard/posts/page.tsx` (wrap with PageHeader)
- `src/app/dashboard/posts/create/page.tsx` (wrap with PageHeader + Section)
- `src/app/dashboard/posts/edit/[postId]/page.tsx` (wrap with PageHeader + Section)
- `src/components/Dashboard/Blog/PostForm.tsx` (re-style chrome — outer only, don't touch editor logic)
- `src/components/Dashboard/Blog/AdminPostListView.tsx` (swap inner table to DataTable)

**Verify**: `/dashboard/posts` lists posts with new toolbar. `/dashboard/posts/create` opens the editor in a 2-column layout. `npx tsc --noEmit` passes.

### Chunk 5 — Data management (depends on chunk 1)
**Files**:
- `src/app/dashboard/categories/page.tsx` + 4 children
- `src/app/dashboard/users/page.tsx`
- `src/app/dashboard/advertisements/page.tsx`
- `src/app/dashboard/header-ad/page.tsx` + `HeaderAdsClient.tsx`
- `src/app/dashboard/exchange-rates/page.tsx` + 9 children in `_components/`
- `src/app/dashboard/rate-lists/page.tsx`
- `src/app/dashboard/service-requests/page.tsx`
- `src/app/dashboard/reports/page.tsx` + `ActivityLogsData.tsx` + `SystemLogsData.tsx`

**Verify**: All routes load with new chrome. Tables render with `DataTable`. `npx tsc --noEmit` passes.

### Chunk 6 — Settings + profile (depends on chunk 1)
**Files**:
- `src/app/dashboard/settings/page.tsx`
- `src/components/Dashboard/Settings/SystemSettings.tsx`
- `src/components/Dashboard/Settings/SocialLinksManager.tsx`
- `src/app/dashboard/edit-profile/page.tsx`
- `src/app/dashboard/billing-address/page.tsx`
- `src/app/dashboard/subscription/page.tsx`
- `src/app/dashboard/loading.tsx`
- `src/app/dashboard/error.tsx`

**Verify**: Settings tabs render in `ds2-card` panels. Profile edit opens with new chrome. Loading skeletons appear on refresh. `npx tsc --noEmit` passes.

### Final review
After all chunks: `npm run lint && npx tsc --noEmit && npm run build`. Fix any issues.

---

## 12. Acceptance criteria

The redesign is **complete** when ALL of these pass:

1. **Lighthouse** on `/dashboard` (mobile, simulated 4G): Performance ≥ 95, Accessibility = 100, Best Practices ≥ 95, SEO ≥ 95.
2. **Lighthouse** on each sub-route: Accessibility = 100.
3. **Keyboard-only walkthrough**: every page reachable via Tab; every action activatable via Enter/Space; focus always visible; Esc closes menus/dialogs.
4. **Screen reader test** (VoiceOver or NVDA): every table has a caption or `aria-label`; every form has labels; toasts are announced.
5. **RTL walkthrough** (browser set to Persian): layout mirrors correctly; no horizontal scroll; no `left`/`right` regressions.
6. **Dark mode**: every page renders correctly with `prefers-color-scheme: dark`; contrast ≥ 4.5:1 for body text.
7. **Reduced motion**: every animation is paused or zeroed; the magnetic CTA does not move.
8. **`npm run build`** exits 0 with no warnings (other than known acceptable ones — list them).
9. **`npm run lint`** exits 0.
10. **`npx tsc --noEmit`** exits 0.
11. **No emojis** anywhere in source.
12. **No placeholders** ("TODO", "FIXME", "Lorem ipsum") introduced.
13. **No deletions** of files outside the explicitly listed ones (v1 dead code stays).
14. **Visual smoke test** on every route at 375px, 768px, 1024px, 1440px — no broken layouts, no overflow.

---

## 13. Risk register

| Risk | Mitigation |
|---|---|
| Tailwind v4 utility name collisions between `dash-*` and `dash2-*` | Use the `dash2-` prefix for all new classes; never reuse `dash-*`. |
| `next dev --turbopack` regressions if a contributor forgets the `--webpack` flag | Add a comment in `package.json` `dev` script and in `globals.css` header (already done). |
| Prisma schema unrelated to this change | Do not touch `prisma/` or `src/actions/`. |
| `revalidateTag` API change in Next 16 | Use `@/lib/revalidate` only (already enforced). |
| Existing `useSidebarStore` Zustand store conflict | Don't replace; extend the store with `setActiveHref` for the new active-rail indicator. |
| Existing shadcn primitives not aligned with new `ds2-*` style | Don't replace shadcn — add `ds2-*` as an additive layer. Existing components keep using shadcn primitives; new primitives use `ds2-*`. |
| `Backdrop blur` perf on low-end devices | Limit blur to top bar + command-K + hero `__stat` panel only. Use `supports-[backdrop-filter]` fallback. |
| View Transitions API not supported in older browsers | `@supports (view-transition-name: x)` gating. No JS-side throw. |
| Tiptap editor styling inside new `ds2-card` wrapper | Add scoped CSS in the editor wrapper to reset Tiptap's toolbar. |

---

## 14. Files NOT to touch

- `prisma/**` (schema, migrations, seed)
- `src/actions/**` (server actions)
- `src/lib/**` (auth, db, storage, rate-limiter, email, revalidate, etc.)
- `src/app/api/**` (API routes)
- `src/app/(site)/**` (public marketing pages)
- `src/app/setup/**`
- `src/components/Dashboard/DashboardPage/DashboardPage.tsx` (v1 orchestrator — dead code, leave alone)
- `src/components/Dashboard/DashboardPage/KpiBento.tsx`, `CardList.tsx`, `BlogStatCard.tsx`, `AnalyticsPanel.tsx`, `DonutChart.tsx`, `TrafficChart.tsx`, `TrafficChartInner.tsx`, `ActivityFeed.tsx`, `VisitorDistribution.tsx`, `DetailedStatInfo.tsx`, `DraftPostCard.tsx` (v1 dead code)
- `src/components/Dashboard/DashboardPage/WelcomeSection/**` (v1 dead code)
- `src/components/ui/**` (shadcn primitives — don't modify)

---

**Document version**: 2026-06-24 · Maintainer: dashboard redesign planning sub-agent
