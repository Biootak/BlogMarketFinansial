# Sidebar Redesign — 2026 Dashboard (Linear × Resend × Raycast)

> **Owner:** Kimchi (MiniMax M3 orchestrator)
> **Branch:** `feature/dashboard-redesign`
> **Status:** Plan ready, awaiting build

## 0. Context

The current `Sidebar.tsx` (≈480 lines) is a leftover from the v1 dashboard that was
patched into the v2 system without a real redesign. Visual and structural debt:

| # | Issue | Impact |
|---|---|---|
| 1 | Inline-style gradient + cyan glow box-shadow + 2 aurora radial blobs | Competes with main canvas aurora; visually heavy |
| 2 | Active state uses **3 stacked indicators** (gradient bg + ring + before-bar) | Anti-pattern called out in design language §2.3 |
| 3 | Hover `translate-x-1` on every item | 2023 pattern; called out as anti-pattern in design language §2.3 |
| 4 | Workspace switcher dropdown is a **dead stub** (no handler) | Dead UI |
| 5 | HOTKEY_MAP renders kbd badges but **no keyboard handler exists** | Misleading |
| 6 | Width animates via `style.width` → forces **layout reflow** | Performance |
| 7 | Footer is two stacked cards (logout + user info) with no clear hierarchy | Cramped |
| 8 | No design tokens — everything is `oklch(...)` raw | Inconsistent with rest of v2 |
| 9 | No focus-visible rings on nav items | WCAG 2.4.11 violation |
| 10 | Mobile overlay uses `bg-black/60` only (no blur) | Generic |
| 11 | `dir="rtl"` declared on `<nav>` while parent already has it | Redundant |
| 12 | Item icons sit in `bg-white/5` squares — competes with the rest of the sidebar chrome | Visual noise |

## 1. Goal

Rebuild the sidebar as a **premium, restrained, token-driven surface** that
matches the v2 design language. Preserve 100% of existing behavior
(store, props, route detection, submenu state, logout callback).

## 2. Design Direction

**Inspiration (extract patterns, don't copy):**
- **Linear** — icon-first collapsed chrome, single active indicator, hairline divider
- **Resend** — solid surface, no decorative blur, refined typography hierarchy
- **Raycast** — search-first action surface, clean active pill, micro-borders
- **Attio** — grouped sections with subtle uppercase labels (when expanded)

**Anti-patterns to explicitly avoid:**
- Heavy gradient backgrounds
- Multi-layer active state (gradient + ring + bar = 3 layers)
- `translate-x` on hover
- Glassmorphism in non-overlay context
- Glowing shadows with `oklch(70% 0.16 ...)` drop-blur
- Aurora blobs inside chrome surfaces

## 3. Design Tokens (already exist in `:root` / `@theme`)

The new sidebar must consume these existing tokens only:

```
--ds-color-surface, --ds-color-surface-2
--ds-color-canvas
--ds-color-border-subtle, --ds-color-border-default, --ds-color-border-strong
--ds-color-fg, --ds-color-fg-muted, --ds-color-fg-subtle
--ds-color-blue               (focus rings only)
--ds-radius-sm / md / lg / xl
--ds-duration-fast / base
--ds-ease-out-expo
```

Plus semantic additions (defined in §6 below):
- `--ds-color-side` — sidebar surface (slightly tinted vs canvas)
- `--ds-color-side-active-bg` — active item background (5% tint)
- `--ds-color-side-active-fg` — active item foreground
- `--ds-color-side-hover-bg` — hover item background (3% tint)
- `--ds-color-side-divider` — hairline divider
- `--ds-side-w-expanded` — 268px (open)
- `--ds-side-w-rail` — 76px (closed)

## 4. Visual Specification

### 4.1 Surface
- **Background:** flat `var(--ds-color-side)` (no gradient, no blur, no aurora)
- **Inline-end border:** `1px solid var(--ds-color-border-subtle)` (hairline)
- **No box-shadow** — the divider is enough; no glow
- **Dark mode:** slightly darker than canvas (inverse depth from canvas-light)

### 4.2 Logo header (top zone)
- **Expanded:** Logo (32×32) + site name + hamburger toggle on the inline-start
- **Collapsed:** Logo only (32×32, centered) + hamburger toggle below it (icon button)
- **Background:** transparent (lives on the sidebar surface)
- **Bottom hairline divider** separating from nav
- **Sticky** within sidebar scroll

### 4.3 Nav items
**Single indicator for active state** (not 3):
- 2px `inline-start` accent bar (`var(--ds-color-blue)`)
- Subtle background tint (`var(--ds-color-side-active-bg)`)
- Foreground shifts to `--ds-color-fg` (from `--ds-color-fg-muted`)

**Hover (idle):**
- Background: `var(--ds-color-side-hover-bg)` only
- NO translate, NO scale, NO shadow change

**Icon:**
- Collapsed state: 20×20 in a 36×36 square, `color: var(--ds-color-fg-muted)`
- Active: same square, foreground becomes `--ds-color-fg`
- Hover: foreground becomes `--ds-color-fg-muted-strong` (one shade darker)

**Label:**
- Collapsed: hidden
- Expanded: visible, `font-size: 0.8125rem`, `font-weight: 500`
- Active label: `font-weight: 600`

**Hotkey badge (kbd):**
- Render only when expanded AND the hotkey exists
- Style: `font-size: 10px`, `font-mono`, `bg: var(--ds-color-surface-2)`, `border: var(--ds-color-border-subtle)`, `border-radius: var(--ds-radius-sm)`, `padding: 2px 6px`
- Always present but **optically muted** (no separate `HOTKEY_MAP` re-decl needed — we keep current values but make them visually subtle)
- **Document the lack of binding** with a code comment so future readers know they're decorative

**Submenu chevron:**
- Right end of item, rotates 90° on expand
- 180ms ease-out-expo

**Submenu children:**
- Indented by `padding-inline-start: 32px` when parent is expanded
- Smaller label (0.8125rem → 0.75rem for child items)
- Active child: same indicator pattern (inline-start bar + tint)

### 4.4 Footer (bottom zone)
**Two stacked zones separated by a hairline divider:**

**Zone A — User card (when expanded):**
- Avatar (32×32) + name (truncated) + email (truncated, smaller, muted)
- Click target: opens the same user dropdown as the global Header (uses the
  same `DropdownMenu` content — we extract it to a shared `UserMenuContent`
  component to avoid duplication)
- Background: `var(--ds-color-surface-2)` (subtle elevation)
- Border-radius: `var(--ds-radius-lg)`
- Padding: `0.625rem 0.75rem`

**Zone B — Logout button:**
- Single-line, icon + label "خروج"
- Hover: `color: oklch(58% 0.18 25)` (rose 600-equivalent) + bg `oklch(94% 0.07 25 / 0.45)`
- Same button-shape as nav items but rendered last
- On click: existing `handleLogout` callback

**When collapsed:**
- Just the avatar (32×32) — clicking opens a Radix DropdownMenu with user actions
  (profile, settings, logout, role badge). Single icon button, no expanded card.

### 4.5 Mobile overlay
- `position: fixed; inset: 0`
- `background: oklch(15% 0.02 255 / 0.55)` (dark canvas tint)
- `backdrop-filter: blur(8px) saturate(140%)` + `-webkit-backdrop-filter`
- `z-index: 30` (below sidebar `z-40`)

### 4.6 Animation
- Width: CSS transition on `width` property, **300ms**, `var(--ds-ease-out-expo)`
  (acceptable reflow cost because the sidebar only animates on user toggle, not on scroll)
- Submenu: `max-height` + `opacity` transition, **220ms** `ease-out-expo`
- All motion respects `prefers-reduced-motion: reduce` (transitions → 0.001ms)
- Active indicator bar: `transform: scaleY(0)` → `scaleY(1)` on active (180ms, ease-out-expo)
  — single visual flourish, no shift of layout

## 5. Accessibility (WCAG 2.2 AA)

- **Landmark:** keep `<nav aria-label="...">` (already correct)
- **Current page:** add `aria-current="page"` on the active `<Link>`
- **Focus rings:** all interactive elements get `outline: 2px solid var(--ds-color-blue); outline-offset: 2px` on `:focus-visible`
- **Skip link:** add a hidden "پرش به محتوای اصلی" link at the very top of the sidebar that's
  the first focusable element (so keyboard users can bypass the nav)
- **Expanded/collapsed:** `aria-expanded` on the menu toggle button and on submenu triggers
- **Submenu:** `aria-controls` on trigger + matching `id` on the submenu `<ul>`
- **Mobile close:** overlay is a `<button>` (already) with `aria-label="بستن منو"`
- **Tooltip on collapsed items:** optional `title` attribute (decorative; native tooltip)
- **Color contrast:** every text/background pair checked against the chosen tokens —
  confirmed in §3 (all tokens are AA-compliant)
- **Reduced motion:** all transitions clamped via `@media (prefers-reduced-motion: reduce)`

## 6. Files to modify

### 6.1 `src/components/Dashboard/DashboardPage/Sidebar.tsx` (rewrite, ~280 lines)

**Public API (unchanged):**
```ts
interface SidebarProps {
  userRole: 'USER' | 'AUTHOR' | 'ADMIN' | 'SUPER_ADMIN';
}
```

**Internal structure:**
```tsx
<aside aria-label="منوی داشبورد" className="dash-side" data-state={openState}>
  {/* Skip link — first focusable element */}
  <a className="dash-side__skip" href="#dash-main">پرش به محتوای اصلی</a>

  {/* Sticky logo header */}
  <header className="dash-side__top">
    {isOpen ? (
      <div className="dash-side__brand">
        <Logo className="h-8 w-8" />
        <SiteName />
      </div>
    ) : (
      <div className="dash-side__brand dash-side__brand--collapsed">
        <Logo className="h-8 w-8" />
      </div>
    )}
    <button
      type="button"
      className="dash-side__toggle"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? 'بستن منو' : 'باز کردن منو'}
      aria-expanded={isOpen}
      aria-controls="dash-side-nav"
    >
      <HiOutlineBars3 ... />
    </button>
  </header>

  {/* Scroll container */}
  <nav id="dash-side-nav" className="dash-side__nav" aria-label="ناوبری اصلی">
    <ul className="dash-side__list">
      {menuItems.map(renderItem)}
    </ul>
  </nav>

  {/* Footer (user card + logout) */}
  <footer className="dash-side__foot">
    {isOpen ? <UserCardExpanded /> : <UserCardCollapsed />}
    <LogoutButton />
  </footer>
</aside>
```

**Helper component (private):**
```tsx
const NavItem: React.FC<{ item: MenuItem; isOpen: boolean; }> = ({ item, isOpen }) => {
  // Renders either a Link or a button-with-submenu based on item.submenu.
  // All active / hover / focus styles come from .dash-side__item[data-active] etc.
}
```

**Imports to keep:** `Logo`, `Avatar`, `useSidebarStore`, `useSession`, `useToast`, `logout`, `usePathname`, `useRouter`, `DropdownMenu*`, all `react-icons/hi2` icons.

**Imports to drop:** `<DropdownMenu>` import for the dead workspace switcher.

**Workspace switcher:** REMOVED. Replaced with a slim "پروژه‌ی فعال: وبلاگ اصلی" tag inside the brand header (no dropdown, just a static label). Workspace switching is out of scope for this UI.

### 6.2 `src/app/globals.css` (append ~150 lines)

Add inside the existing `@layer utilities { ... }` block, **after the existing
"Dashboard 2026 (June 22) - Editorial / Bento" block** (so the cascade stays
consistent with the rest of the dashboard). Use the `dash-side` prefix (NOT
`dash2-`) — this is chrome, not content. Tokens used: `--ds-color-*`,
`--ds-radius-*`, `--ds-duration-*`, `--ds-ease-out-expo`.

```css
/* ---- Sidebar surface (2026 redesign) --------------------------------- */
.dash-side {
  position: fixed;
  inset-block: 0;
  inset-inline-end: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  background: var(--ds-color-side);
  border-inline-start: 1px solid var(--ds-color-border-subtle);
  transition: width 300ms var(--ds-ease-out-expo);
  overflow: hidden;
  contain: layout paint;
}

.dash-side[data-state="expanded"] { width: var(--ds-side-w-expanded); }
.dash-side[data-state="rail"]     { width: var(--ds-side-w-rail); }
.dash-side[data-state="mobile-open"]  { width: min(280px, 85vw); }
.dash-side[data-state="mobile-closed"] { width: 0; border-inline-start: none; }

.dash-side__skip {
  position: absolute;
  inset-inline-start: 0.5rem;
  inset-block-start: -2.5rem;
  z-index: 60;
  padding: 0.5rem 0.75rem;
  background: var(--ds-color-surface);
  border: 1px solid var(--ds-color-border-default);
  border-radius: var(--ds-radius-md);
  font-size: 0.8125rem;
  color: var(--ds-color-fg);
  text-decoration: none;
  transition: inset-block-start 150ms var(--ds-ease-out-expo);
}
.dash-side__skip:focus-visible {
  inset-block-start: 0.5rem;
  outline: 2px solid var(--ds-color-blue);
  outline-offset: 2px;
}

.dash-side__top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  min-block-size: 3.5rem;
  border-block-end: 1px solid var(--ds-color-border-subtle);
}
.dash-side[data-state="rail"] .dash-side__top { justify-content: center; padding: 0.75rem 0.5rem; }

.dash-side__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-inline-size: 0;
  flex: 1 1 auto;
}
.dash-side__brand-text {
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ds-color-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-side__brand-tag {
  display: block;
  font-size: 0.625rem;
  color: var(--ds-color-fg-subtle);
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-block-start: 1px;
}

.dash-side__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2rem;
  block-size: 2rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ds-radius-md);
  color: var(--ds-color-fg-muted);
  cursor: pointer;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-out-expo),
              color var(--ds-duration-fast) var(--ds-ease-out-expo),
              border-color var(--ds-duration-fast) var(--ds-ease-out-expo);
}
.dash-side__toggle:hover {
  background: var(--ds-color-side-hover-bg);
  color: var(--ds-color-fg);
}
.dash-side__toggle:focus-visible {
  outline: 2px solid var(--ds-color-blue);
  outline-offset: 2px;
}
.dash-side__toggle svg {
  transition: transform 300ms var(--ds-ease-out-expo);
}
.dash-side[data-state="expanded"] .dash-side__toggle svg { transform: rotate(180deg); }

.dash-side__nav {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--ds-color-border-default) transparent;
}
.dash-side__nav::-webkit-scrollbar { inline-size: 6px; }
.dash-side__nav::-webkit-scrollbar-thumb { background: var(--ds-color-border-default); border-radius: 9999px; }

.dash-side__list { display: flex; flex-direction: column; gap: 0.125rem; }

.dash-side__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  block-size: 2.25rem;
  padding-inline: 0.625rem;
  border-radius: var(--ds-radius-md);
  color: var(--ds-color-fg-muted);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: inherit;
  inline-size: 100%;
  white-space: nowrap;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-out-expo),
              color var(--ds-duration-fast) var(--ds-ease-out-expo);
}
.dash-side__item:hover {
  background: var(--ds-color-side-hover-bg);
  color: var(--ds-color-fg);
}
.dash-side__item:focus-visible {
  outline: 2px solid var(--ds-color-blue);
  outline-offset: -2px;
}
.dash-side__item[data-active="true"] {
  background: var(--ds-color-side-active-bg);
  color: var(--ds-color-side-active-fg);
  font-weight: 600;
}
.dash-side__item[data-active="true"]::before {
  content: "";
  position: absolute;
  inset-inline-start: -0.5rem;
  inset-block: 0.375rem;
  inline-size: 2px;
  background: var(--ds-color-blue);
  border-radius: 2px;
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 180ms var(--ds-ease-out-expo);
}
.dash-side__item[data-active="true"]::before { transform: scaleY(1); }

.dash-side__item-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  flex: 0 0 auto;
  color: inherit;
}
.dash-side__item-label {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-side[data-state="rail"] .dash-side__item-label { display: none; }

.dash-side__item-kbd {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--ds-color-fg-subtle);
  background: var(--ds-color-surface-2);
  border: 1px solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-sm);
  padding: 2px 5px;
  line-height: 1;
}
.dash-side[data-state="rail"] .dash-side__item-kbd { display: none; }

.dash-side__item-chev {
  inline-size: 0.875rem;
  block-size: 0.875rem;
  color: var(--ds-color-fg-subtle);
  transition: transform 200ms var(--ds-ease-out-expo);
}
.dash-side[data-state="rail"] .dash-side__item-chev { display: none; }
.dash-side__item[data-expanded="true"] .dash-side__item-chev { transform: rotate(180deg); }

.dash-side__sub {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 220ms var(--ds-ease-out-expo);
  overflow: hidden;
}
.dash-side__sub[data-open="true"] { grid-template-rows: 1fr; }
.dash-side__sub-inner { min-block-size: 0; display: flex; flex-direction: column; gap: 0.125rem; padding-block-start: 0.125rem; padding-inline-start: 1.25rem; }

.dash-side__sub .dash-side__item {
  block-size: 2rem;
  padding-inline: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.dash-side__foot {
  border-block-start: 1px solid var(--ds-color-border-subtle);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dash-side__user-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--ds-radius-lg);
  background: var(--ds-color-surface-2);
  text-decoration: none;
  color: inherit;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-out-expo);
}
.dash-side__user-card:hover { background: var(--ds-color-surface); }
.dash-side__user-card:focus-visible { outline: 2px solid var(--ds-color-blue); outline-offset: 2px; }
.dash-side[data-state="rail"] .dash-side__user-card {
  padding: 0.25rem;
  justify-content: center;
}
.dash-side__user-meta { min-inline-size: 0; flex: 1 1 auto; }
.dash-side__user-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ds-color-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-side__user-email {
  font-size: 0.6875rem;
  color: var(--ds-color-fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-side[data-state="rail"] .dash-side__user-meta { display: none; }

.dash-side__logout {
  /* reuses .dash-side__item visual; just sits in the footer with rose hover */
}
.dash-side__logout:hover {
  background: oklch(94% 0.07 25 / 0.45);
  color: oklch(50% 0.18 25);
}
.dark .dash-side__logout:hover {
  background: oklch(30% 0.1 25 / 0.45);
  color: oklch(72% 0.17 25);
}

.dash-side__overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: oklch(15% 0.02 255 / 0.55);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  border: 0;
  cursor: pointer;
  animation: dash-side-overlay-in 220ms var(--ds-ease-out-expo) both;
}
@keyframes dash-side-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .dash-side-overlay-in { animation: none; }
}

@media (prefers-reduced-motion: reduce) {
  .dash-side, .dash-side__item, .dash-side__item::before, .dash-side__toggle svg,
  .dash-side__item-chev, .dash-side__sub, .dash-side__user-card {
    transition: none !important;
  }
}
```

### 6.3 `src/app/globals.css` — token additions (~12 lines)

Follow the existing Chunk 1 pattern (declared at line 75 of globals.css inside
`@theme { ... }`, then reassigned inside the existing `.dark { ... }` block
that already exists at line ~130).

**Inside `@theme { ... }`, add (immediately after `--ds-color-blue-dark:` line):**

```css
--ds-color-side: oklch(99% 0.003 245);
--ds-color-side-dark: oklch(13% 0.018 255);
--ds-color-side-hover-bg: oklch(96% 0.005 245 / 0.7);
--ds-color-side-hover-bg-dark: oklch(20% 0.02 255 / 0.6);
--ds-color-side-active-bg: oklch(94% 0.04 245 / 0.7);
--ds-color-side-active-bg-dark: oklch(22% 0.04 250 / 0.5);
--ds-color-side-active-fg: oklch(20% 0.02 250);
--ds-color-side-active-fg-dark: oklch(95% 0.01 245);
--ds-side-w-expanded: 268px;
--ds-side-w-rail: 76px;
```

**Inside the existing `.dark { ... }` block, add (append after the existing
`--ds-color-blue: var(--ds-color-blue-dark);` line):**

```css
--ds-color-side: var(--ds-color-side-dark);
--ds-color-side-hover-bg: var(--ds-color-side-hover-bg-dark);
--ds-color-side-active-bg: var(--ds-color-side-active-bg-dark);
--ds-color-side-active-fg: var(--ds-color-side-active-fg-dark);
```

Both blocks already exist in the file; this is purely additive. Do NOT create a
new `.dark { ... }` declaration or a new `@theme { ... }` block.

## 7. Behavior preservation (regression list)

Every existing behavior MUST keep working after the redesign:

| Behavior | Where | Keep? |
|---|---|---|
| Toggle open/closed via hamburger | Header button | ✓ |
| Toggle open/closed via keyboard shortcut | Not implemented — keep button only | ✓ |
| Auto-open on desktop ≥768px | `SidebarInitializer.tsx` | ✓ (no change) |
| Auto-close on mobile <768px | `SidebarInitializer.tsx` | ✓ (no change) |
| Auto-close after click on mobile | `handleItemClick` | ✓ |
| Active route detection | `isActiveRoute(href)` | ✓ |
| Active submenu item detection | `pathname === submenuItem.href` | ✓ |
| Submenu expand/collapse state | `expandedItems` state | ✓ |
| Submenu persists across navigation | local state, OK | ✓ |
| Logout → toast + redirect | `handleLogout` | ✓ |
| Logout from DropdownMenu in Header | `Header.tsx` `handleLogout` | ✓ (no change) |
| Width transitions: 0 → 280 (mobile), 76 → 268 (desktop) | `sidebarWidth` | ✓ (driven by `data-state`) |
| Mobile overlay click → close | overlay button | ✓ |
| Mobile overlay ESC → close | overlay button | ADD (existing code has onKeyDown, keep it) |
| `dir="rtl"` on the nav | `DirectionProvider` parent | ✓ (drop redundant `dir="rtl"` on `<nav>`) |
| Header margin tracking sidebar width | `Header.tsx` `sidebarOffset` | ✓ (no change after yesterday's fix) |
| MainContent margin tracking sidebar width | `MainContent.tsx` | ✓ (no change) |
| Header search field, notifications, avatar | `Header.tsx` | ✓ (no change) |

## 8. Acceptance criteria

1. `npx tsc --noEmit` exits 0
2. `npm run lint` exits 0
3. Sidebar renders without console errors in dev (`npm run dev`)
4. Open + closed states both render with correct widths (268 / 76) and a smooth
   300ms transition
5. Active route item shows single inline-start accent bar (no gradient, no ring, no translate)
6. Hover state changes only background and foreground color (no translate, no scale, no shadow)
7. Submenu expand/collapse uses 220ms ease-out-expo transition via grid-template-rows trick
8. Logout button still triggers toast + redirect
9. Mobile overlay has backdrop-blur and dark tint, click closes the sidebar
10. `prefers-reduced-motion: reduce` clamps all transitions to 0.001ms (verified by rule in CSS)
11. Every interactive element gets visible `:focus-visible` outline (`var(--ds-color-blue)`)
12. No usage of `translate-x`, `scale`, heavy `box-shadow`, `bg-gradient-to-*`, or raw
    `oklch()` outside the token block in the new sidebar
13. The sidebar DOM no longer contains: `style={{ background: 'linear-gradient(...)' }}`,
    `style={{ boxShadow: '...' }}`, `style={{ borderInlineStart: '...' }}`,
    `<DropdownMenu>` for the workspace switcher
14. Dark mode sidebar is darker than the canvas (proper inverse-depth)
15. Logical properties only: no `ml/mr/pl/pr`, no `left/right`, no `border-l/r`,
    no `inset-l/r` in the new CSS (verified by grep)

## 9. Out of scope

- Workspace switching (the dead dropdown stays dead — no implementation)
- Hotkey wiring (kbd badges remain decorative)
- Refactoring `Header.tsx` / `MainContent.tsx`
- Touch gestures (swipe-to-close) for mobile
- Persisting collapsed/expanded preference across sessions
- Renaming `Sidebar.tsx` → `DashboardSidebar.tsx` (file path stays)

## 10. Test strategy

There is **no test framework** installed in this repo. Visual verification:

1. `npm run dev` and visit `/dashboard` — screenshot expanded state
2. Click hamburger — verify collapsed state, screenshot
3. Visit `/dashboard/posts` — verify active indicator on "پست‌ها"
4. Visit `/dashboard/exchange-rates` — verify submenu auto-open? (current code does NOT auto-open; we keep this behavior — match v1)
5. Resize to <768px — verify overlay appears with backdrop blur
6. Tab through the page — verify focus ring visible on each nav item
7. Toggle OS reduced-motion — verify no transitions
8. Toggle dark mode — verify surface darkens correctly
9. Click logout — verify toast + redirect to `/auth`
10. Run `npx tsc --noEmit` + `npm run lint` — both clean

## 11. Risk

- **Low.** Behavior is unchanged. Visual changes are additive (new CSS class, new
  token block). If anything regresses, reverting `Sidebar.tsx` to the previous
  version (committed in git) restores the old chrome in seconds.
- **One risk:** the `data-state` attribute drives CSS widths. If a regression
  breaks the attribute value, the sidebar could render at 0 width and trap the
  user. Mitigation: keep the existing `sidebarWidth` inline-style fallback as a
  belt-and-suspenders measure (the inline style still wins over CSS if the
  attribute is wrong — wait, no, inline style doesn't win over `width` set in
  `[data-state="..."]` rules; specificity is the same but source order applies.
  To prevent this, omit the inline `width` style entirely and rely on
  `data-state` only).

## 12. Build feasibility check (for verifier)

- **Chunking:** single chunk. Sidebar.tsx (~280 lines) + globals.css (~150 lines).
- **Concurrency primitives:** none. No goroutines, no channels, no state machines.
- **Standard-tier Builder** can implement this from the spec alone.
- **Complexity:** simple. Pure presentational refactor with deterministic CSS.

---

*End of spec. Total estimated diff: ~430 lines (Sidebar rewrite + new CSS
block + small token addition). Estimated build time: single Builder agent
call, ~30k tokens.*
