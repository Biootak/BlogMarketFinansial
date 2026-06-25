# Dashboard Sidebar 2026 Redesign — Adaptive Morph

**Date:** 2026-06-25
**Status:** Approved (Approach A)
**Author:** Pi assistant (brainstorming session)
**Scope:** `src/components/Dashboard/DashboardPage/Sidebar.tsx` + `src/app/globals.css` (`.dash-side*` block)

---

## Goal

Redesign the dashboard sidebar with **2026 visual language** (Aurora Glass + Spring Physics + Bottom Sheet) while preserving the existing role-based item structure. No new features, no schema changes — pure visual + interaction upgrade.

## Approved decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Visual direction | **Aurora Glass** (Linear / Arc / Reflect vibe) |
| 2 | Mobile behavior | **Bottom Sheet** with 3 snap points + drag handle |
| 3 | Animation physics | **Spring Physics** (real stiffness + damping) |
| 4 | Approach | **A — Adaptive Morph** (multi-state, no structural change) |
| 5 | Scope | Visual-only (current item list preserved) |

## Non-goals

- No role-gating changes
- No schema migration
- No new menu items (e.g. `/billing-address`, `/subscription` stay hidden as today)
- No real hotkey wiring (decorative badges either removed or kept as-is)

---

## Design overview

The sidebar becomes a **single morphing surface** that adapts across viewports and interactions:

```
desktop ≥1024px   → expanded (280px) ↔ rail (76px) with spring
tablet 768-1024px → rail only (76px), expands on hover/focus
mobile  <768px    → bottom sheet (closed / half / full) with drag
```

All three states share the same **Aurora Glass surface** — a layered glass panel with drifting aurora orbs behind it, spring-eased width transitions, and live micro-interactions on every interactive surface.

## Visual language

### 1. Aurora background
- Three soft radial gradients drift behind the sidebar (`:before` on `.dash-side`):
  - `--aurora-1`: oklch primary tint at 35% alpha
  - `--aurora-2`: oklch accent tint at 28% alpha
  - `--aurora-3`: oklch tertiary tint at 22% alpha
- Drift animation: `@keyframes aurora-drift` 32s linear infinite
- Honors `prefers-reduced-motion: reduce` (static positions)
- Clipped by sidebar border-radius (24px expanded, 20px mobile sheet)

### 2. Glass surface
```
backdrop-filter: blur(28px) saturate(180%);
background: linear-gradient(180deg,
  color-mix(in oklch, var(--ds-color-side) 88%, transparent),
  color-mix(in oklch, var(--ds-color-side) 72%, transparent)
);
border-inline-end: 1px solid color-mix(in oklch, white 12%, transparent);
box-shadow:
  0 1px 0 0 color-mix(in oklch, white 18%, transparent) inset,
  0 32px 64px -32px color-mix(in oklch, black 24%, transparent),
  0 8px 24px -8px color-mix(in oklch, black 12%, transparent);
```

Dark mode:
```
background: linear-gradient(180deg,
  color-mix(in oklch, var(--ds-color-side-dark) 78%, transparent),
  color-mix(in oklch, var(--ds-color-side-dark) 62%, transparent)
);
border-inline-end: 1px solid color-mix(in oklch, white 6%, transparent);
box-shadow:
  0 1px 0 0 color-mix(in oklch, white 4%, transparent) inset,
  0 32px 64px -32px black,
  0 8px 24px -8px black;
```

### 3. Active item — Glow Pill
Replaces the current 2px blue bar with a luminous pill:
```
.dash-side__item[data-active] {
  background: color-mix(in oklch, var(--primary) 14%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in oklch, var(--primary) 30%, transparent) inset,
    0 0 24px -8px color-mix(in oklch, var(--primary) 60%, transparent),
    0 0 0 1px color-mix(in oklch, white 8%, transparent) inset;
  /* inner highlight layer */
}
.dash-side__item[data-active]::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg,
    color-mix(in oklch, white 14%, transparent),
    transparent 50%
  );
  pointer-events: none;
}
```
- Icon container inside active item gets `background: color-mix(in oklch, var(--primary) 18%, transparent)` with `scale(1.04)`
- A small dot indicator (8px) on the inline-end side with a soft pulse (1.6s)
- Indicator, not bar — modern pattern

### 4. Hover — Subtle Lift
```
.dash-side__item:hover {
  background: color-mix(in oklch, var(--ds-color-side-hover-bg) 92%, transparent);
  transform: translateY(-1px);
}
.dash-side__item:hover .dash-side__item-ico {
  transform: scale(1.08);
}
.dash-side__item:hover .dash-side__item-label {
  transform: translateX(4px);  /* RTL: negative on :dir(rtl) */
}
```
Transition: `--ds-duration-base` (200ms) with `--ds-ease-spring`.

### 5. Quick search (top of sidebar)
Always-visible compact input (rail hides it, expands to a wider pill on hover):
```
.dash-side__search {
  height: 36px;
  border-radius: var(--ds-radius-lg);
  background: color-mix(in oklch, var(--ds-color-side-hover-bg) 70%, transparent);
  border: 1px solid color-mix(in oklch, white 8%, transparent);
}
.dash-side__search:focus-within {
  background: color-mix(in oklch, var(--ds-color-side) 95%, transparent);
  border-color: color-mix(in oklch, var(--primary) 40%, transparent);
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--primary) 14%, transparent);
}
```
- Pressing `/` focuses it (handled by `useEffect` in `Sidebar.tsx` listening to keydown)
- On focus the wrapper expands width by 4px with spring
- `Esc` blurs and clears the query
- **Behavior**: client-side filter on visible `menuItems` (matches label/title substring, Persian-aware via `String.prototype.normalize('NFC')`); non-matching items fade out (`opacity: 0; height: 0; margin: 0`) with 180ms transition
- Empty results show an inline "موردی یافت نشد" message (Persian)
- The search is **independent** of `CommandPalette.tsx` (which is global); this is sidebar-scoped
- On mobile bottom sheet, the search lives at the top of the sheet above the nav

### 6. Profile / Logout area
Sticky footer with two-tier layout:
- Avatar pill (always visible) with hover-reveal user name
- Logout as icon-only when rail, label-when-expanded otherwise
- Subtle separator (1px gradient line) above footer

### 7. Mobile bottom sheet
- Container position: `fixed; inset-inline: 0; bottom: 0; z-index: 50`
- Three snap points via CSS scroll-snap (no library needed):
  - **Closed**: `transform: translateY(100%)`
  - **Half**: `transform: translateY(50vh)` — drag handle + nav + 4 items visible
  - **Full**: `transform: translateY(0)` — drag handle + full nav + profile
- Drag handle: 40×4px pill, centered top
- Backdrop: full-screen button with `backdrop-filter: blur(8px)` and `background: rgba(0,0,0,0.4)`
- Tap on backdrop closes to half, swipe down past threshold closes fully
- Rounded top corners: 28px 28px 0 0

### 8. Floating pill toggle (desktop)
Existing `dash-side__pill` enhanced:
- Now has a subtle inner glow when sidebar is collapsed
- Tooltip appears on hover (first-time only) — uses CSS-only `[data-tooltip]` pattern
- Animation: spring scale on hover (1.0 → 1.06)

## Animation tokens

New tokens added to `:root` in `globals.css`:
```css
--ds-spring-stiff: 320;
--ds-spring-damp: 28;
--ds-ease-spring-out: cubic-bezier(0.34, 1.4, 0.64, 1);
--ds-ease-spring-in-out: cubic-bezier(0.65, 0, 0.35, 1.2);

--ds-aurora-speed: 32s;
--ds-pulse-speed: 1.6s;
```

Spring usage:
- Width morph (rail ↔ expanded): `transition: width 360ms var(--ds-ease-spring-out)`
- Hover lift: `transition: transform 200ms var(--ds-ease-spring-out), background 200ms ease`
- Active glow: `transition: box-shadow 240ms var(--ds-ease-spring-out)`
- Bottom sheet snap: `transition: transform 420ms var(--ds-ease-spring-out)`
- Indicator pulse: `@keyframes pulse-dot 1.6s ease-in-out infinite`

All gated by `@media (prefers-reduced-motion: reduce)`.

## Component changes

### Files to modify
1. `src/components/Dashboard/DashboardPage/Sidebar.tsx` — markup, search input, mobile bottom sheet wrapper, dynamic drag handler
2. `src/app/globals.css` (`.dash-side*` block, lines 9069–9468) — full visual rewrite
3. `src/components/Dashboard/DashboardPage/SidebarInitializer.tsx` — extend mobile detection + initial sheet snap

### Files to add
- `src/hooks/useDragSheet.ts` — small hook for drag-to-snap. Signature: `useDragSheet({ snapPoints: [closed, half, full], initial: SnapState }) => { snap, setSnap, dragHandlers }`. Uses native `pointerdown`/`pointermove`/`pointerup`, `touchAction: 'none'`, captures pointer, calculates delta vs threshold (40% of viewport height) for snap promotion/demotion. No external library.
- `src/components/Dashboard/DashboardPage/SidebarSheet.tsx` — mobile bottom sheet wrapper. Renders drag handle, search input, nav list, profile footer. Sticky-positioned. Uses `useDragSheet` internally. Imported only when `isMobile === true` from `Sidebar.tsx`.

### Files NOT touched
- `DashboardProviders.tsx` — already passes role, no change needed
- `Header.tsx` — already mirrors sidebar state
- `MainContent.tsx` — already reserves sidebar width
- Any actions, lib files, or DB code

## Data flow

```
Sidebar (client)
  ├─ useSidebarStore (Zustand)         ← width state, mobile flag
  ├─ useSession (NextAuth)             ← user info
  ├─ useDragSheet (new hook)           ← mobile snap state
  ├─ local state: search query, sheet snap point
  └─ role-based menu items (existing getMenuItems)
       └─ renders NavItem (with submenu support)
```

No new server calls, no new data fetching. All existing behavior preserved.

## Acceptance criteria

1. **Visual upgrade applied** — Aurora background visible behind glass, glow pill on active, hover lift on items.
2. **Spring physics** — All transitions use spring easing; width morph feels bouncy without overshoot.
3. **Mobile bottom sheet** — Drag handle visible, three snap points work via drag and tap, backdrop blurs content.
4. **RTL preserved** — All new properties use logical values; Persian labels render correctly; mirror transforms correct.
5. **Dark mode parity** — Both modes look polished; no white-on-white or invisible borders.
6. **Reduced-motion respected** — All new animations disabled under `prefers-reduced-motion: reduce`.
7. **Existing behavior intact** — Role-based items, submenu, profile card, logout, mobile hamburger trigger all still work.
8. **Bug fix** — `--ds-color-fg` undefined reference removed; MainContent `marginRight` → `marginInlineStart`.
9. **No regression** — `npm run lint` and `npx tsc --noEmit` pass.
10. **Visual smoke test** — Dev server renders cleanly at 1440px, 1024px, 768px, 375px.

## Verification commands

```bash
npm run lint                              # ESLint passes
npx tsc --noEmit                          # Type check passes
npm run dev                               # Sidebar renders at all 4 viewports
```

Manual checks:
- Hover an item → lift + icon scale
- Click an item → active glow appears, pulse dot visible
- Toggle to rail → width morphs with spring bounce
- Open on mobile → bottom sheet slides up, drag handle works
- Toggle dark mode → both modes polished
- Enable reduced-motion → animations freeze

## Out of scope (deferred)

- Real hotkey wiring (decorative badges removed in this pass)
- Live notification counts in sidebar items (Bento approach)
- AI Concierge (separate ferment)
- Workspace switcher (separate ferment)
- RTL `marginRight` bug in MainContent (fixed as part of this PR since it's a sidebar-coupled prop)
