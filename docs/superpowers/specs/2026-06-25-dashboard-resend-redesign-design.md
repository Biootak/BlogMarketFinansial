# Dashboard Resend-Inspired Redesign — Design Spec

**Date:** 2026-06-25  
**Scope:** Dashboard main page + all sub-routes (`posts`, `categories`, `users`, `settings`, `exchange-rates`, `reports`, `service-requests`, `subscription`, `billing-address`, `advertisements`, `header-ad`, `rate-lists`).  
**Approach:** Evolve the existing v2 dashboard (`src/components/Dashboard/DashboardPage/v2/`) instead of rebuilding from scratch. Keep backend contracts and server actions unchanged; changes are presentation-layer only.  
**North Star:** Linear × Vercel × Stripe × Notion × Resend — minimal, professional, luxurious, human, fully RTL-optimized for Persian.

---

## 1. Design Principles

1. **Whitespace is content.** Generous, rhythmic spacing replaces decorative borders. Cards breathe with `1.25rem`–`2rem` internal padding and `1rem`–`1.5rem` external gutters.
2. **Depth through layering, not drop shadows.** Use `bg-canvas`, `bg-surface`, `bg-surface-elevated` plus 1px hairline borders (`border-subtle`) and soft ambient gradients instead of heavy shadows.
3. **Motion is information.** Every transition answers a state change: hover, focus, loading, selection, success. No ornamental motion.
4. **RTL-first.** All spacing, grids, and icons use logical properties (`inline-start`, `block-start`, `gap`, `padding-inline`). No `left`/`right` hardcoding.
5. **Color discipline.** Three families only: neutral canvas, brand indigo/cyan, and semantic accents (emerald success, amber warning, rose danger). No neon, no gradients-as-decoration.

---

## 2. Visual Language

### 2.1 Color Tokens (OKLCH, perceptually uniform)

```css
--ds-canvas: oklch(97% 0.005 260);          /* page background */
--ds-surface: oklch(100% 0 0);             /* cards */
--ds-surface-elevated: oklch(99% 0.006 260);
--ds-border-subtle: oklch(88% 0.01 260);
--ds-border-hover: oklch(82% 0.015 260);
--ds-text-primary: oklch(22% 0.02 260);
--ds-text-secondary: oklch(45% 0.02 260);
--ds-text-tertiary: oklch(58% 0.015 260);
--ds-brand: oklch(58% 0.18 265);           /* Resend-ish indigo */
--ds-brand-text: oklch(96% 0.005 260);
--ds-success: oklch(58% 0.14 160);
--ds-warning: oklch(70% 0.14 85);
--ds-danger: oklch(55% 0.18 22);
```

Dark mode flips canvas to `oklch(18% 0.025 260)` and surfaces to `oklch(22% 0.02 260)`.

### 2.2 Typography

- **Body:** Vazirmatn (already loaded), weights 400/500/600/700.
- **Scale:** Minor-third scale anchored at `0.8125rem` (13px) for UI labels, `0.9375rem` body, `1.125rem` section titles, `1.875rem` page headlines.
- **Metrics:** `line-height` 1.5 body, 1.25 headings. `letter-spacing` tight (`-0.01em`) for Persian numerals and Latin microcopy.

### 2.3 Radii & Borders

- Cards: `1rem` (`--ds-radius-xl`)
- Inputs/buttons: `0.75rem`
- Pills/badges: `9999px`
- Borders: `1px solid var(--ds-border-subtle)` with a subtle top highlight in dark mode.

### 2.4 Elevation

Only two shadows:
```css
--ds-shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.04);
--ds-shadow-md: 0 4px 12px -2px oklch(0% 0 0 / 0.06);
```
Sticky toolbars use a `border-b` plus `backdrop-blur`, never a shadow.

---

## 3. Dashboard Main Page

### 3.1 Layout Skeleton

```
┌─ SkipLink ──────────────────────────────────────────────┐
│  Workspace Toolbar (sticky, date-range + density + ⌘K)   │
├─ Main Canvas ───────────────┬─ Right Rail ──────────────┤
│  Hero Card                  │  Scheduled Posts           │
│  KPI Bento (4/5 metrics)    │  System Health             │
│  Engagement + Activity      │                            │
│  Analytics Tabs             │                            │
│  Posts Spotlight            │                            │
└─────────────────────────────┴────────────────────────────┘
```

- **Canvas:** 70–75% width on `xl`, single column on mobile.
- **Rail:** 25–30% width, becomes a bottom section on mobile.
- **Gutter:** `1.25rem` desktop, `0.75rem` mobile.

### 3.2 Hero Card

- **Left:** Persian weekday + date + Tehran clock (live, 30s tick) + time-of-day greeting + role pill.
- **Right:** Large today-views KPI with a 7-day sparkline and "زنده" pulse.
- **Bottom row:** Edit-profile shortcut + trend chip.
- **Effects:** Subtle conic gradient border animation on hover (gated by `prefers-reduced-motion`).

### 3.3 KPI Bento

- 4 metric cards on desktop, 2×2 on tablet, 1 column on mobile.
- Each card: icon + label + big number + delta badge + mini bar/sparkline.
- Colors map to semantic meaning (emerald for positive, amber for warnings).

### 3.4 Engagement Donut

- Donut chart showing shares of views/likes/comments/shares.
- Range chips switch between `all`, `today`, `week` without a network round-trip.

### 3.5 Activity Rail

- Day-grouped activity list with avatars and timestamps.
- Empty state uses the shared `EmptyState` primitive.

### 3.6 Posts Spotlight

- Two tabs: "محبوب‌ترین" and "پیش‌نویس‌ها".
- Compact list items with hover spotlight effect.

---

## 4. Shared Primitives (to be created / hardened)

Located in `src/components/ds/` and reused across all dashboard sub-routes.

| Primitive | Purpose | Notes |
|-----------|---------|-------|
| `DashCard` | Surface container | `bg-surface`, `border-subtle`, `radius-xl`, hover lift |
| `DashButton` | Primary/secondary/ghost | Focus ring, loading state, magnetic hover optional |
| `DashInput` | Text/select inputs | Floating label pattern, inline validation |
| `DashTable` | Data tables | Sticky header, row hover, selection checkboxes |
| `DashBadge` | Status badges | Semantic colors, dot variant |
| `DashEmpty` | Empty states | Icon + headline + optional CTA |
| `DashToolbar` | Page toolbar | Title + actions + search, sticky on scroll |
| `DashTabs` | Segmented tabs | URL-persisted where useful |

All primitives honor `prefers-reduced-motion` and keyboard navigation.

---

## 5. Sub-route Design

### 5.1 `/dashboard/posts`

- **Toolbar:** Title + "پست جدید" CTA + search + filter chips (status, category, author) + view toggle (grid/list).
- **Table columns:** Title, author, category, status, views, publish date, actions.
- **Row actions:** Edit, preview, delete (with confirmation), quick-publish.
- **Empty state:** "هنوز پستی ندارید" + CTA.

### 5.2 `/dashboard/categories`

- Two-column layout: tree/list on left, edit/create form on right.
- Drag handle for reordering (keyboard accessible via up/down buttons).
- Color picker for category accent.

### 5.3 `/dashboard/users`

- Data table with role badges, last active, email.
- Bulk actions toolbar appears on selection.
- Role editing via inline dropdown.

### 5.4 `/dashboard/settings`

- Vertical tabbed layout (General, Social, SEO, Notifications, Security).
- Each tab is a card with grouped fields.
- Save bar appears docked at bottom when dirty.

### 5.5 `/dashboard/exchange-rates`

- Toolbar: last sync time + refresh + source filter.
- Main table: symbol, source, buy, sell, change %, updated at.
- Inline editing drawer (Resend-style side panel).
- Discovery command for adding symbols.

### 5.6 Other routes

Apply the same `DashCard`/`DashToolbar`/`DashTable` vocabulary. Convert existing forms to use shared primitives. Remove one-off styled-components/inline styles.

---

## 6. Micro-interactions & Motion

1. **Page entrance:** Staggered fade-in from `opacity: 0, translateY: 12px` to rest. Duration `300ms`, easing `cubic-bezier(0.16, 1, 0.3, 1)`.
2. **Card hover:** Border color shifts to `--ds-border-hover`; background lifts `1px` via `translateY(-1px)` (no shadow change that causes layout shift).
3. **Button hover:** Background lightens; optional magnetic cursor follow on primary CTAs.
4. **Focus rings:** `2px` brand ring with `2px` offset on all interactive elements.
5. **Loading:** Skeleton placeholders matching final dimensions (no spinner that collapses layout).
6. **Spotlight effect:** On card hover, a radial gradient follows the cursor inside the card border. Implemented with CSS custom properties updated via `onPointerMove` throttled to `requestAnimationFrame`.
7. **Reduced motion:** All transforms and opacity transitions become instant when `prefers-reduced-motion: reduce`.

---

## 7. Accessibility (WCAG 2.2 AA)

- Semantic HTML: `main`, `nav`, `aside`, `section`, headings hierarchy preserved.
- Skip links on every dashboard page.
- All interactive elements keyboard-focusable with visible focus rings.
- ARIA labels for icon-only buttons.
- Color contrast ≥ 4.5:1 for text, ≥ 3:1 for UI components.
- No motion that violates vestibular preferences.
- Tables use proper `th`/`scope` and caption where needed.

---

## 8. Performance Budget

- First-load JS per dashboard route ≤ 180 KB (gzipped).
- CLS on `/dashboard` ≤ 0.05.
- No dashboard component larger than 50 KB gzipped; code-split heavy charts.
- Images use `next/image` with explicit dimensions.
- CSS stays in `globals.css`; avoid runtime CSS-in-JS.

---

## 9. Implementation Phases

1. **Foundation** — Audit existing `dash2-*` tokens, add missing Resend tokens, harden `src/components/ds/` primitives.
2. **Shell + Main Page** — Refactor `DashboardShell`, `HeroSection`, `KpiGrid`, add entrance animations and spotlight effects.
3. **Sub-routes (core 5)** — `posts`, `categories`, `users`, `settings`, `exchange-rates`.
4. **Sub-routes (remaining)** — `reports`, `service-requests`, `subscription`, `billing-address`, `advertisements`, `header-ad`, `rate-lists`.
5. **Verification** — `npx tsc --noEmit`, `npm run lint`, accessibility checklist, build.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Pre-existing CSS build crash | Fix or isolate the `globals.css` cssnano issue before final build; consider splitting dashboard CSS into a separate file. |
| Large scope | Do routes incrementally; each route must build/typecheck before moving to the next. |
| RTL regressions | Use logical properties; test with `dir="rtl"`. |
| Motion sensitivity | Gate all animation behind `prefers-reduced-motion`. |
| Breaking dashboard auth | Never touch `checkRole`/`requireAuth` wrappers; only change presentation. |

---

## 11. Files Expected to Change

- `src/app/globals.css` — token additions/refinements.
- `src/components/ds/primitives/*.tsx` — new/enhanced primitives.
- `src/components/Dashboard/DashboardPage/v2/*.tsx` — evolved shell components.
- `src/app/dashboard/page.tsx` — wiring.
- `src/app/dashboard/*/page.tsx` and local `_components/*.tsx` — sub-route redesigns.
- `src/components/Dashboard/shared/*.tsx` — shared dashboard table/form helpers.
