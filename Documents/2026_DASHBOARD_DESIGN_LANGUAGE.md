# 2026 Admin / Dashboard Design Language — Research & Rules

A single reference document distilling the visual + interaction language used by best-in-class 2026 consoles (Resend, Linear, Vercel, Stripe, Notion, Polar.sh, Cal.com, Dub.co) into concrete Tailwind v4 / Radix UI / RTL-ready rules.

Target stack: **Next.js (App Router) + Tailwind v4 + Radix UI + next-themes + Vazirmatn (Persian, RTL)**.

---

## 0. Sources & how to read this

References (all publicly observable on the production apps and their public docs / changelogs as of 2026-06):

- Resend console — [resend.com/docs](https://resend.com/docs), [resend.com](https://resend.com)
- Linear app — [linear.app](https://linear.app), [linear.app/docs](https://linear.app/docs), [linear.app/method](https://linear.app/method)
- Vercel dashboard — [vercel.com](https://vercel.com), [vercel.com/docs](https://vercel.com/docs), [vercel.com/observability](https://vercel.com/observability)
- Stripe Atlas / Sigma — [stripe.com/atlas](https://stripe.com/atlas), [stripe.com/sigma](https://stripe.com/sigma)
- Notion — [notion.so](https://notion.so), [notion.so/product/ai](https://www.notion.so/product/ai)
- Polar.sh — [polar.sh](https://polar.sh), [github.com/polarsource/polar](https://github.com/polarsource/polar)
- Cal.com — [cal.com](https://cal.com), [github.com/calcom/cal.com](https://github.com/calcom/cal.com)
- Dub.co — [dub.co](https://dub.co), [github.com/dubinc/dub](https://github.com/dubinc/dub)
- Tailwind v4 — [tailwindcss.com/docs](https://tailwindcss.com/docs), [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4)
- Radix UI — [radix-ui.com/primitives](https://www.radix-ui.com/primitives)
- WCAG 2.2 — [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/)
- View Transitions API — [developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)

> **Reading note**: each product gets a "what they do" line + the **concrete rules** to extract. The final section collapses everything into a hand-off list for a builder agent.

---

## 1. Layout patterns — sidebar, top bar, page chrome

### 1.1 Resend console (resend.com)
- **Left rail**: 56px collapsed, 240px expanded. Icon + label. Floating, NOT flush to edge — 8px outer margin, `rounded-xl`, sits on the canvas background. White in light mode, near-black elevated surface in dark.
- **Top bar**: 56px tall. Breadcrumb on the left (in RTL: right). Right side (left in RTL): command-K trigger pill (`⌘K`), avatar, env switcher (Prod / Staging pill).
- **Page chrome**: 24px page padding, max-width 1280px content column with `mx-auto`. No full-bleed canvases for inner pages.

### 1.2 Linear
- Two-tier sidebar: workspace switcher (top, avatar-only 40px square) + icon nav (64px wide). When expanded into "issues" pane, the icon nav becomes 240px and the issue list becomes the third column (248px).
- **No floating sidebars**. The sidebar is `bg-canvas` itself with a 1px right divider (`border-subtle`). Flat, not elevated.
- Top bar has *no* breadcrumb — Linear uses the **issue ID as the title** (`ENG-1423`) and a `…` kebab on the right for metadata.
- Page transitions are instant, with a `view-transition-name` swap for the issue title (see §11).

### 1.3 Vercel observability
- **Top-anchored chrome**: NO persistent sidebar in the new (2025+) Vercel console. A `command-K`-first nav pattern. When you open a project, a **project-scoped sub-nav** (tabs: Overview / Logs / Analytics / Speed Insights / Settings) appears below the global header.
- Global header is 56px, sticky, with: team switcher, search (`⌘K`), docs link, avatar.
- Page content uses a 12-column fluid grid, `gap-6`, max-width 1440.

### 1.4 Stripe (Atlas & Sigma)
- **Sigma**: 3-pane (sidebar 240px, list 320px, detail flex). Sidebar is flush, `border-r`, no radius on the sidebar itself.
- **Atlas**: heavy use of a top "wizard" progress bar (stepper) above a centered max-width 720px column. Much more form-driven than dashboard-driven.
- **Billing/Invoice UI**: classic 2-pane — list left, detail right.

### 1.5 Notion
- **Sidebar is the brand**. Tree-style, collapsible, **fully resizable from 260–480px** by dragging the right edge. Sidebar is `bg-canvas`, items are 28px tall, hover reveals a `+` and `⋯` per row.
- Page body has **no top bar**. The page title is the first block, editable inline. Sub-pages get a breadcrumb only when deeply nested.
- **"Quick Find"** (⌘P) replaces any nav for power users.

### 1.6 Polar.sh
- Two-tier sidebar: org selector at top (with logo + chevron), then icon + label nav. Width 240px expanded / 64px collapsed. Sticky. No floating chrome.
- Top bar: page title on left, breadcrumbs above it (`text-xs text-muted-foreground`), action buttons on right.

### 1.7 Cal.com
- Settings uses a **3-column layout**: settings groups list (240px) | settings nav (240px) | content. Heavy use of inline section headers with anchor links.
- Booking pages use a centered 480px form column on a tinted canvas.

### 1.8 Dub.co
- Standard 2-pane: sidebar 240px (logo + nav + workspace switcher), content area. Tinted canvas (`bg-zinc-50 dark:bg-zinc-950`), elevated cards.
- Top bar inside content: breadcrumb + actions.

### 1.9 Consensus rules (sidebar)
| Decision | Rule | Exceptions |
|---|---|---|
| Width | 240px expanded / 56–64px collapsed | Notion (resizable 260–480) |
| Floating or flush? | **Flush** with 1px `border-r border-subtle` is the 2026 default (Linear, Polar, Notion, Dub) | Resend floats it for "marketing-grade" consoles |
| Background | Same as canvas (`bg-background`) OR a slightly darker `bg-muted/40` | Never `bg-card` |
| Top bar height | **56px** | All eight agree |
| Breadcrumb position | Above page title, `text-xs text-muted-foreground` | Vercel hides breadcrumb in favor of tabs |
| Page padding | `px-6 py-6` mobile, `px-8 py-8` desktop, max-width 1280–1440 | Stripe Sigma uses full-bleed |

### 1.10 RTL implementation
- Use **CSS logical properties** everywhere (`ms-`, `me-`, `ps-`, `pe-`, `border-s`, `border-e`, `start-`, `end-`). Never `ml-` / `mr-` / `pl-` / `pr-` / `left-` / `right-`.
- Set `<html dir="rtl" lang="fa">` at the root layout. Use Tailwind v4's `dir` variant: `ms-2`, `me-auto`, `text-start`.
- Persian numerals: switch to `font-feature-settings: "ss01"` (Vazirmatn ships with a `tnum`/`ss01` style) — see §9.

---

## 2. Card / pane design

### 2.1 What the leaders do
- **Resend**: cards are `bg-card` on a `bg-canvas` (tinted) background. Radius `rounded-xl` (12px). 1px border `border-zinc-200/70 dark:border-zinc-800`. **No shadows in light mode**, very subtle inner shadow in dark.
- **Linear**: `rounded-lg` (8px). No border on most cards — uses a 1px-tinted background `bg-zinc-100 dark:bg-zinc-900` to separate from canvas. Heavy use of *inset* effects (a 1px highlight at the top edge using `box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06)` in dark).
- **Vercel**: cards are `rounded-md` (6px) with a 1px border, **no shadow in light, a single ambient shadow in dark** (`shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_8px_24px_-8px_rgb(0_0_0/0.6)]`).
- **Stripe**: larger radius (`rounded-lg` 10px), hairline border, on a `#f6f9fc` canvas. Strong use of **elevation tiers** — Level 0 = canvas, Level 1 = card, Level 2 = popover (with shadow).
- **Polar / Dub**: rounded-xl, hairline border, no shadow. Restraint is the 2026 mood.

### 2.2 Glass / blur
- **Avoid** `backdrop-filter: blur()` on cards in 2026 dashboards. It's a 2023–2024 trend that has aged poorly (perf + visual noise). Linear, Vercel, Resend all use *opaque* surfaces with subtle tint shifts.
- The one place blur is still acceptable: **command-K modal** background (Resend, Dub) and **top-bar glass on mobile scroll**.

### 2.3 Hover treatment
- Default hover: `bg-muted/60` or `bg-zinc-50 dark:bg-zinc-900` for ~120ms.
- For interactive cards (clickable tiles): add `hover:border-zinc-300 dark:hover:border-zinc-700` + the bg shift. No scale transforms on entire cards (causes layout jank).

### 2.4 Concrete Tailwind v4
```html
<article class="
  rounded-xl border border-zinc-200/70 bg-white p-6
  dark:border-zinc-800 dark:bg-zinc-900
  transition-colors duration-150
  hover:border-zinc-300 dark:hover:border-zinc-700
">
  ...
</article>
```

### 2.5 RTL: card padding uses `p-6`, not directional. Icons inside a card header get `ms-2` for the gap to the right-of-text (in RTL: left of text).

---

## 3. Tables / lists

### 3.1 The Linear model (gold standard)
- **Row height**: 36px (compact) or 44px (comfortable). Default is 36px.
- **Row hover**: `bg-zinc-100/70 dark:bg-zinc-800/50`. No row border — alternating rows are NOT used. The list is a single visual plane.
- **Sticky header**: yes, `sticky top-0`, `bg-canvas/80 backdrop-blur` (the one place blur is acceptable in 2026). Header is `text-xs font-medium uppercase tracking-wider text-muted-foreground`.
- **Multi-select**: `space` to toggle, `shift+↑/↓` for range, `⌘A` for all. Selected rows get `bg-blue-500/10` (or accent at 10% opacity) — **NOT a border**.
- **First column**: 32px checkbox gutter, then the primary identifier (left-aligned in LTR, right-aligned in RTL).
- **Last column**: actions kebab + a chevron-right affordance that only appears on hover.

### 3.2 Resend tables
- Identical to Linear. 36px rows, sticky header, monospace for IDs and timestamps.

### 3.3 Vercel observability logs
- **Monospace everywhere** — log tables are 100% `font-mono` to keep timestamps and IDs aligned.
- Row density: 28px (very compact). Header is a separate non-sticky toolbar with filters.

### 3.4 Stripe Sigma
- More traditional: header has explicit background `bg-zinc-50 dark:bg-zinc-900`, 1px borders between rows, zebra optional. They're optimizing for *finance users* who expect grid lines.

### 3.5 Consensus table rules
```html
<div class="overflow-hidden rounded-xl border border-zinc-200/70 dark:border-zinc-800">
  <!-- Sticky header -->
  <div class="sticky top-0 z-10 flex h-9 items-center border-b border-zinc-200/70
              bg-white/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/60
              text-xs font-medium uppercase tracking-wider text-zinc-500
              dark:border-zinc-800 dark:bg-zinc-950/80 dark:supports-[backdrop-filter]:bg-zinc-950/60 dark:text-zinc-400">
    <div class="w-8"></div>            <!-- checkbox gutter -->
    <div class="flex-1 ps-2">Name</div>
    <div class="w-32 ps-2 text-start">Status</div>
    <div class="w-24 ps-2 text-start">Amount</div>
  </div>

  <ul role="list" class="divide-y divide-zinc-100 dark:divide-zinc-800/70">
    <li class="group flex h-9 items-center px-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
      ...
    </li>
  </ul>
</div>
```

### 3.6 Density toggle
- Provide a `Density` selector in the table toolbar (Linear, Polar). Persist in localStorage.
- Compact: `h-9`, `text-sm`. Comfortable: `h-11`, `text-sm` with `py-1`.

---

## 4. Metric tiles (KPI cards)

### 4.1 Patterns
- **Vercel** is the canonical 2026 KPI card:
  - 12px radius, 1px border, no shadow.
  - Top: `text-sm font-medium text-muted-foreground` label + a `?` info icon button on the opposite side.
  - Middle: huge number, `text-3xl font-semibold tracking-tight tabular-nums`.
  - Below: change indicator (`+12.4%` green / `-3.1%` red) + a 14-day sparkline (`h-8`, no axes, no grid).
  - The sparkline is a 1px SVG path with `stroke="currentColor"` and a 12% opacity fill below.

### 4.2 Resend KPI tiles
- Same as Vercel but the sparkline sits **inline to the right of the number** at 40px wide × 24px tall. The label sits *above* the number, change below. Saves vertical space.

### 4.3 Linear
- Less numeric; uses **ring progress** for goal completion (e.g., "23/100 issues closed this sprint"). Ring is `stroke-width="6"`, color = accent.

### 4.4 Concrete tile
```html
<div class="rounded-xl border border-zinc-200/70 bg-white p-5
            dark:border-zinc-800 dark:bg-zinc-900">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-zinc-500 dark:text-zinc-400">درآمد امروز</span>
    <InfoButton />  <!-- Radix tooltip trigger -->
  </div>

  <div class="mt-2 flex items-baseline gap-2">
    <span class="text-3xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
      ۱٬۲۴۲٬۰۰۰
    </span>
    <span class="text-sm text-zinc-500">تومان</span>
  </div>

  <div class="mt-1 flex items-center justify-between">
    <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <ArrowUpRightIcon class="size-3" />
      +۱۲٫۴٪
    </span>
    <Sparkline data={...} class="h-8 w-20 text-emerald-500" />
  </div>
</div>
```

### 4.5 Change indicator colors
- Up = good = `text-emerald-600 dark:text-emerald-400`. Down = bad = `text-rose-600 dark:text-rose-400`. **Always pair with an icon** (ArrowUpRight / ArrowDownRight) for color-blind users. Never rely on color alone.

### 4.6 RTL: arrows must flip. Use `rtl:-scale-x-100` on the icon, or use directional icons (`ArrowUpRight` / `ArrowDownRight` are RTL-safe because they encode the diagonal).

---

## 5. Charts

### 5.1 Defaults in 2026
- **Library**: Recharts is still dominant; **Tremor v4** and **Visx** for custom. Newer entrants: **Recharts v3** (with `view-transition-name` support), **ECharts 6**.
- **Color palette** (most-used chart palette, lifted from Linear + Vercel + Stripe):
  - `text-zinc-900` / `text-zinc-50` for primary series
  - `text-blue-500`, `text-violet-500`, `text-emerald-500`, `text-amber-500`, `text-rose-500`, `text-cyan-500` — in that order.
  - For >6 series, generate via `oklch()` with constant lightness (`oklch(0.7 0.15 <hue>)`).

### 5.2 Axis typography
- `text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400`.
- Axis lines: `stroke-zinc-200 dark:stroke-zinc-800` at `stroke-width="1"`.
- Grid lines: `stroke-zinc-100 dark:stroke-zinc-900` — *barely visible* on canvas, the 2026 default.

### 5.3 Mount animation
- Path draw: `pathLength: 0 → 1`, `duration: 600ms`, `ease: [0.16, 1, 0.3, 1]` (custom easeOutExpo).
- Bar grow: `scaleY: 0 → 1` from the baseline, `originY: 1`, staggered 20ms.
- Respect `prefers-reduced-motion: reduce` → set duration to 0 and skip.

### 5.4 Dark-mode charts
- Use `currentColor` and the `text-` utility on the parent, so the chart auto-flips.
- Replace pure white gridlines with `rgb(255 255 255 / 0.04)`.

### 5.5 RTL
- Recharts: pass `layout="vertical"` and reverse data, OR use a transform. For axis labels, write labels directly (no localization issues if you use Persian numerals via Vazirmatn).

---

## 6. Buttons / controls

### 6.1 Hierarchy (3 levels)
| Level | Style | Used for |
|---|---|---|
| **Primary** | `bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200` | Submit, Send, Confirm |
| **Secondary** | `bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800` | Cancel, Back |
| **Ghost / Tertiary** | `bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300` | Inline actions, table row buttons |
| **Destructive** | `bg-rose-600 text-white hover:bg-rose-700` | Delete, Revoke |

### 6.2 Sizes (Tailwind tokens used by Linear/Resend)
- `xs`: `h-7 px-2 text-xs gap-1.5`
- `sm`: `h-8 px-3 text-sm gap-1.5` (default)
- `md`: `h-9 px-4 text-sm gap-2`
- `lg`: `h-10 px-5 text-base gap-2`
- **Icon-only**: square aspect, `size-8` (sm), `size-9` (md). Always include `aria-label` and an `sr-only` text.

### 6.3 Roundness
- All 2026 leaders use `rounded-md` (6px) for buttons inside dense tables, `rounded-lg` (8px) for hero CTAs, **never pill-shaped** (`rounded-full`) for primary actions (Vercel, Stripe, Resend all confirm).

### 6.4 Iconography
- Lucide icons at 16px (sm) or 18px (md). `stroke-width="1.75"` (Lucide default; Vercel uses 1.5 for finer detail).
- Icon button: `inline-flex items-center justify-center rounded-md size-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`.

### 6.5 Concrete
```html
<button class="
  inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium
  bg-zinc-900 text-white shadow-[0_1px_0_rgb(255_255_255/0.1)_inset]
  hover:bg-zinc-800
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
  disabled:opacity-50 disabled:cursor-not-allowed
  dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200
">
  ارسال
</button>
```

---

## 7. Color palette

### 7.1 The 2026 "neutral-with-an-accent" palette
Based on Resend, Linear, Vercel, Stripe, Polar, Dub — all converge on **zinc-based neutrals + a single saturated accent**.

#### Light mode
```css
--color-canvas:           rgb(247, 248, 250);  /* app background */
--color-surface:          rgb(255, 255, 255);  /* cards */
--color-surface-2:        rgb(240, 242, 246);  /* nested, hover */
--color-border-subtle:    rgb(224, 228, 235);
--color-border-default:   rgb(210, 217, 230);
--color-border-strong:    rgb(180, 190, 210);
--color-fg:               rgb(20, 23, 32);
--color-fg-muted:         rgb(110, 119, 137);
--color-fg-subtle:        rgb(152, 161, 178);
--color-accent:           rgb(94, 106, 230);   /* indigo-blue, Vercel-ish */
--color-accent-fg:        rgb(255, 255, 255);
```

#### Dark mode
```css
--color-canvas:           rgb(20, 23, 32);
--color-surface:          rgb(26, 30, 41);
--color-surface-2:        rgb(36, 41, 54);
--color-border-subtle:    rgb(46, 52, 68);
--color-border-default:   rgb(58, 65, 84);
--color-border-strong:    rgb(82, 91, 115);
--color-fg:               rgb(228, 230, 238);
--color-fg-muted:         rgb(152, 161, 178);
--color-fg-subtle:        rgb(110, 119, 137);
--color-accent:           rgb(121, 134, 247);  /* brighter in dark */
--color-accent-fg:        rgb(20, 23, 32);
```

### 7.2 Status colors (semantic)
| Token | Light | Dark | Use |
|---|---|---|---|
| success | `text-emerald-600 bg-emerald-500/10` | `text-emerald-400 bg-emerald-500/15` | OK, paid, sent |
| warning | `text-amber-600 bg-amber-500/10` | `text-amber-400 bg-amber-500/15` | Pending, retry |
| danger | `text-rose-600 bg-rose-500/10` | `text-rose-400 bg-rose-500/15` | Failed, deleted |
| info | `text-blue-600 bg-blue-500/10` | `text-blue-400 bg-blue-500/15` | Informational |

### 7.3 Tailwind v4 `@theme` setup (drop-in)
```css
@import "tailwindcss";

@theme {
  /* Semantic */
  --color-background: var(--color-canvas);
  --color-foreground: var(--color-fg);
  --color-card: var(--color-surface);
  --color-card-foreground: var(--color-fg);
  --color-muted: var(--color-surface-2);
  --color-muted-foreground: var(--color-fg-muted);
  --color-border: var(--color-border-default);
  --color-input: var(--color-border-default);
  --color-ring: var(--color-accent);

  /* Font */
  --font-sans: var(--font-vazirmatn), ui-sans-serif, system-ui;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 14px;

  /* Shadows (dark-mode heavy) */
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-popover: 0 8px 24px -8px rgb(0 0 0 / 0.12);
}

.dark {
  --shadow-card: 0 0 0 1px rgb(255 255 255 / 0.04) inset;
  --shadow-popover: 0 0 0 1px rgb(255 255 255 / 0.06), 0 12px 32px -12px rgb(0 0 0 / 0.6);
}
```

This matches the existing `src/app/globals.css` structure — extend it, don't replace.

---

## 8. Motion

### 8.1 Easing curves (2026 consensus)
| Token | Curve | Use |
|---|---|---|
| `ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Page enter, modal open, accordion |
| `ease-in-out-quart` | `cubic-bezier(0.76, 0, 0.24, 1)` | Toggle, tab swap, theme switch |
| `ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | Hover lift, button press |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Toggle pop, drag snap (use sparingly) |

### 8.2 Durations
- Hover: **120ms** (was 150–200ms in 2023).
- Modal / sheet: **240ms** enter, **160ms** exit.
- Page transition: **300ms**.
- Toast: 200ms in, 160ms out, dwell 4s.

### 8.3 Tailwind v4 token setup
```css
@theme {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);

  --animate-accordion-down: accordion-down 240ms var(--ease-out-expo);
  --animate-accordion-up:   accordion-up   160ms var(--ease-out-expo);
  --animate-modal-in:       modal-in       240ms var(--ease-out-expo);
  --animate-fade-in:        fade-in        160ms var(--ease-out-expo);

  @keyframes accordion-down { from { height: 0 } to { height: var(--radix-accordion-content-height) } }
  @keyframes accordion-up   { from { height: var(--radix-accordion-content-height) } to { height: 0 } }
  @keyframes modal-in       { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: none } }
  @keyframes fade-in        { from { opacity: 0 } to { opacity: 1 } }
}
```

### 8.4 `prefers-reduced-motion`
**Mandatory** in 2026. WCAG 2.2 §2.3.3 (AAA) and a baseline AA expectation:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```
Add the same gate in JS for any Framer Motion / Motion-One animations: `useReducedMotion()` from `motion/react`.

---

## 9. Typography

### 9.1 Font choices
- **Resend / Linear / Vercel**: Inter Variable (variable font, `opsz` axis).
- **Dub**: Geist Sans + Geist Mono.
- **Polar**: Inter.
- **For this project**: **Vazirmatn Variable** (already loaded) + **JetBrains Mono Variable** for IDs/timestamps.

### 9.2 Weight pairings (Vercel/Linear)
| Element | Weight | Size | Line-height |
|---|---|---|---|
| Display (page H1) | 600 | 30 / `text-3xl` | 36 / `leading-9` `tracking-tight` |
| H2 | 600 | 24 / `text-2xl` | 32 / `leading-8` |
| H3 | 600 | 18 / `text-lg` | 28 / `leading-7` |
| Body | 400 | 14 / `text-sm` | 20 / `leading-5` |
| Label / Caption | 500 | 12 / `text-xs` | 16 / `leading-4` |
| KPI number | 600 | 30 / `text-3xl` | 36 `tracking-tight tabular-nums` |
| Code / ID | 400 mono | 13 / `text-[13px]` | 20 |

### 9.3 Monospace for numbers
Always `tabular-nums` + `font-mono` for:
- IDs (`eng-1423`, `req_abc123`)
- Timestamps
- Prices, percentages, byte counts
- Anything that gets right-aligned in tables

Tailwind: `class="font-mono tabular-nums tracking-tight"`.

### 9.4 Persian numerals
Vazirmatn Variable includes 4 numeral styles (ss01–ss04). Default in this project should be Persian (`۰۱۲۳`). For prices, prefer Persian. For IDs and timestamps in code-style contexts, Latin is fine.

```css
.numerals-fa { font-feature-settings: "ss01"; }  /* Persian */
.numerals-en { font-feature-settings: "ss02"; }  /* Latin tabular */
```

---

## 10. Spacing / sizing

### 10.1 Base unit
- Tailwind's 4px base is universal. Use the following canonical spacing tokens:
  - **4** (1) — icon gap, tight padding
  - **6** (1.5) — input padding-y, button gap
  - **8** (2) — default gap inside a control
  - **12** (3) — card header / section gap
  - **16** (4) — between cards in a grid
  - **24** (6) — page padding-x
  - **32** (8) — section gap
  - **48** (12) — hero padding-y

### 10.2 Container widths
| Context | Max width |
|---|---|
| Form / wizard (Atlas) | 480–640px |
| Dashboard page | 1280px |
| Wide observability (Vercel logs) | 1440px or full-bleed |
| Settings (Cal) | 1024px |

### 10.3 Vertical rhythm
- All text blocks use `space-y-1` for tight lists, `space-y-2` for normal, `space-y-6` between sections.
- Card sections inside a card: `divide-y divide-zinc-100 dark:divide-zinc-800/70` with each row `py-3` or `py-4`.

### 10.4 Touch targets
- Minimum **40×40px** (WCAG 2.5.8, new in 2.2). For dense tables, 32px is acceptable if the entire row is clickable (Linear model).

---

## 11. 2026 micro-interactions & advanced patterns

### 11.1 View Transitions API (the big 2025–2026 shift)
Used by Linear, Astro, and (newly) Vercel for shared-element transitions.

```tsx
// app/layout.tsx
import { unstable_ViewTransition as ViewTransition } from 'react';

export default function IssueLink({ issue }: { issue: Issue }) {
  return (
    <Link href={`/issues/${issue.id}`}>
      <ViewTransition name={`issue-title-${issue.id}`}>
        {issue.title}
      </ViewTransition>
    </Link>
  );
}
```
For non-React/Next primitives, the underlying CSS:
```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 240ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 11.2 Magnetic buttons (Dub.co homepage, some Linear CTAs)
Use **only on hero CTAs**, never in dense dashboards. Implementation: pointermove listener that translates the button by ±8px max based on cursor proximity to center. Always disable when `prefers-reduced-motion: reduce`.

```tsx
// Pseudo
const onMove = (e) => {
  const r = ref.current.getBoundingClientRect();
  const x = (e.clientX - r.left - r.width / 2) * 0.2;
  const y = (e.clientY - r.top - r.height / 2) * 0.2;
  ref.current.style.transform = `translate(${x}px, ${y}px)`;
};
```

### 11.3 Animated noise textures
2026 trend: subtle SVG `feTurbulence` noise as a 2% opacity overlay on hero sections, empty states, and pricing cards. Adds perceived depth without being skeuomorphic.

```css
.bg-noise {
  background-image: url("data:image/svg+xml,%3Csvg ... %3E");
  /* SVG with <filter id='n'><feTurbulence baseFrequency='0.9'/></filter> */
  opacity: 0.02;
  mix-blend-mode: overlay;
  pointer-events: none;
}
```

### 11.4 Ambient gradients
Linear-style: a fixed `position: fixed inset-0 -z-10` element with a radial gradient blob (blue/violet/cyan) that drifts slowly with `animation: drift 30s linear infinite`. **Respect reduced-motion**: pause the animation.

### 11.5 Scroll-linked animations
Used by Resend for the "what is email" marketing scroll, by Vercel for project timelines.
- Library: **Motion One** (preferred in 2026) or Framer Motion v12+ `useScroll` + `useTransform`.
- Pattern: opacity 0→1 and translateY 24→0 across `offset: ["start end", "end start"]`.
- **Critical**: gate with `prefers-reduced-motion`.

```tsx
import { useScroll, useTransform, motion } from 'motion/react';

const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
const y = useTransform(scrollYProgress, [0, 1], [24, -24]);
```

### 11.6 Spring-based toggles
For switches, checkboxes, theme toggles — use a spring, not an ease.
`transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)`.

### 11.7 Skeleton screens (not spinners)
Vercel, Linear, Resend — **all use skeletons**, never centered spinners, for any load > 200ms. Skeleton = `bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-md`.

### 11.8 Inline data updates (optimistic)
Linear model: update the UI immediately, then reconcile. Use `useOptimistic` (React 19) or SWR's `mutate` with `revalidate: false`.

---

## 12. Tailwind v4 capabilities worth using

### 12.1 `@theme` (already in use in this project)
Declares design tokens that auto-generate utilities: `--color-x` → `bg-x`, `text-x`, `border-x`; `--font-x` → `font-x`; `--radius-x` → `rounded-x`; `--ease-x` → `ease-x`.

### 12.2 `@container` (container queries)
Replace breakpoint-driven layouts with container-driven ones. Critical for sidebar + content patterns where the *content* width matters, not the viewport.

```html
<div class="@container">
  <div class="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4">
    ...
  </div>
</div>
```

Tailwind v4 also supports named containers via `@container/name` and `@sm:name:`.

### 12.3 `color-mix()`
Native CSS — no plugin needed. Example: a button that mixes its bg with the canvas color when hovered.

```html
<button class="bg-[color-mix(in_oklab,var(--color-accent)_85%,white)] hover:bg-[color-mix(in_oklab,var(--color-accent)_100%,white)]">
```

Tailwind v4 has a built-in `bg-accent/85` shorthand, but for complex mixes, use `color-mix` directly. Particularly good for accessible variants of any color.

### 12.4 `oklch()`
Used by Tailwind v4 internally for its color scale (better perceptual uniformity). Use directly for chart palettes:

```html
<div class="bg-[oklch(0.7_0.15_240)]">  /* a perceptually-balanced blue */
```

Generate a 6-step categorical palette by holding L and C constant and stepping hue:
```js
const chartColors = Array.from({ length: 6 }, (_, i) =>
  `oklch(0.7 0.15 ${(i * 60) % 360})`
);
```

### 12.5 `@layer` & cascade layers
Tailwind v4 ships with three layers: `theme`, `base`, `components`, `utilities`. Add custom layers for ordering:

```css
@layer reset, tokens, base, components, utilities, overrides;
```

### 12.6 Custom variants
```css
@custom-variant rtl (&:where([dir="rtl"], [dir="rtl"] *));
@custom-variant hocus (&:hover, &:focus-visible);
```
Then `rtl:ms-2`, `hocus:bg-zinc-100` work as expected.

### 12.7 `@property` for animated custom props
Tailwind v4 honors `@property` registrations so transitions on custom CSS variables are GPU-friendly:
```css
@property --my-progress { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
```

---

## 13. Radix UI primitives — 2026 admin checklist

Already in your `package.json`. Use these:

| Primitive | When | Key 2026 pattern |
|---|---|---|
| `DropdownMenu` | Action menus, table row kebab | `align="end"` (becomes `start` in RTL via `dir` variant) |
| `Dialog` | Modals (Confirm, Create) | Use `showCloseButton={false}` and a custom Radix Close as a Button |
| `Popover` | Filters, formatters, color pickers | Animate with `data-[state=open]:animate-in` |
| `Tooltip` | Icon buttons, truncated text | 200ms delay, instant on `hover` then 100ms close. `side="top"` in RTL flips automatically when wrapped in `[dir=rtl]` provider |
| `Tabs` | Sub-navigation inside a page | Underline style, `motion-safe:transition-colors` |
| `Accordion` | FAQ, settings sections, code collapse | Bind to `data-[state]` for animation, leverage `--radix-accordion-content-height` |
| `ScrollArea` | Any scrolling list > 5 items | Custom scrollbar, `type="hover"` for transient |
| `Select` | Native select replacement | `position="popper"` with collision avoidance |
| `Switch` | Theme toggle, settings on/off | Spring animation on the thumb |
| `Toast` | Transient notifications | `swipeDirection="end"` (becomes `start` in RTL via the toast viewport `dir`) |
| `Command` (via cmdk) | ⌘K palette | The single most important admin primitive in 2026 |

### 13.1 RTL with Radix
Radix primitives auto-flip alignment when wrapped in `<DirectionProvider dir="rtl">` from `radix-ui` package, **provided** you use `align="start" | "end"` instead of `left | right`. Always use start/end.

```tsx
import { DirectionProvider } from '@radix-ui/react-direction';

<DirectionProvider dir="rtl">
  <Tooltip>
    <TooltipTrigger>...</TooltipTrigger>
    <TooltipContent side="top" align="center">...</TooltipContent>
  </Tooltip>
</DirectionProvider>
```

---

## 14. RTL (Persian) — hard rules

1. **Set `dir="rtl"` and `lang="fa"` on `<html>`** at the root layout. Use Next.js metadata or a tiny script in `<head>` to keep it consistent for SSR.
2. **Vazirmatn Variable** — load via `next/font/google` (or local subset). Use `font-vazirmatn` CSS var, fall back to system-ui, then Tajawal (Google's other strong Persian face).
3. **Logical properties everywhere** — `ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`, `border-s`, `border-e`, `text-start`, `text-end`, `inset-s`, `inset-e`. No `pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`.
4. **Icons that imply direction**: arrows (`→`, `←`), chevrons, breadcrumbs — flip with `rtl:scale-x-[-1]` or use `ArrowUpRight`/`ArrowDownRight` (diagonal, direction-safe).
5. **Icons that don't flip**: settings cog, search magnifier, user avatar, kebab `⋯`.
6. **Persian numerals by default** for user-facing prices. Use `Intl.NumberFormat('fa-IR')`:
   ```ts
   new Intl.NumberFormat('fa-IR').format(1242000) // "۱٬۲۴۲٬۰۰۰"
   ```
7. **Dates**: `new Intl.DateTimeFormat('fa-IR', { calendar: 'persian' }).format(d)` for a Jalali date. **Be careful with mixed Gregorian/Persian** in the same row — pair with a tooltip.
8. **Bidirectional text** (mixing Persian + Latin like an email or URL): wrap with `<bdi>` to avoid the Persian text flipping the Latin word into the wrong order.
9. **Form labels** in Persian are right-aligned by default; the `text-start` utility handles this without a `text-right` override.
10. **Number inputs** (`<input type="number">`) are NOT RTL-safe — use `inputmode="decimal"` + a plain text input with Persian numeral conversion.
11. **Money direction**: Iran's currency convention is `1,000 ﷼` or `﷼ 1,000` — check user preference. Default to `﷼ ۱٬۰۰۰` (symbol-before, common in Iranian fintech).
12. **Chart axes**: in RTL dashboards, the time axis should flow **right-to-left**, matching reading direction. Recharts handles this if you reverse the data and use `layout="vertical"`.

---

## 15. WCAG 2.2 AA — admin must-haves

### 15.1 Focus indicators (2.4.11, new in 2.2)
- **Minimum**: 2px outline with 2px offset, color = `--color-ring` (not `--color-accent` — keep these separate so accent changes don't hide focus).
- Apply via `focus-visible:`, not `focus:` (so mouse clicks don't show it).
```html
focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
```
- **Never** `outline: none` without a replacement.

### 15.2 Contrast (1.4.3, 1.4.11)
| Pair | Min ratio |
|---|---|
| Body text on canvas | 4.5:1 |
| Large text (18pt+) on canvas | 3:1 |
| UI components / icons | 3:1 |
| Focus indicator vs adjacent | 3:1 |

Verify with the `color-mix()` approach: `--color-fg: oklch(0.18 0 0)` in light mode gives ~15:1 against `oklch(0.98 0 0)` canvas.

### 15.3 Keyboard nav (2.1.1)
- All interactive elements reachable via Tab in DOM order.
- Skip link as the first focusable element: `<a href="#main" class="sr-only focus:not-sr-only ...">`.
- Radix primitives already implement roving tabindex and Esc-to-close.

### 15.4 Live regions (4.1.3)
- **Toast viewport**: `<ToastViewport aria-label="اعلان‌ها" />`.
- **Form errors**: use Radix Form + `aria-live="polite"` on the error summary at top of form.
- **Optimistic updates**: announce the success, then the (potential) failure. Use a `role="status"` region.

### 15.5 Drag-and-drop alternatives (2.1.1, AA in WCAG 2.2 for complex gestures 2.5.7 / 2.5.8)
- Linear's drag-to-reorder: provides an explicit "Move up/down" menu item as an alternative.

### 15.6 Target size (2.5.8, new in 2.2 AA)
- Minimum **24×24px**. Aim for 40×40px in admin UI.

### 15.7 Accessible name (4.1.2)
- Every button has either visible text, an `aria-label`, or an adjacent label.
- Icon-only buttons: `<button aria-label="حذف"><TrashIcon /></button>`.

### 15.8 Color is not the only means (1.4.1)
- Status indicators always pair color with text/icon (✓ ✓ ✕) — never color-only badges.
- Charts pair color with pattern or label.

---

## 16. Code-style examples (drop-in for builder)

### 16.1 Page shell
```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DirectionProvider dir="rtl">
      <div className="grid min-h-dvh grid-cols-[auto_1fr] bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-col">
          <TopBar />
          <main id="main" tabIndex={-1} className="flex-1 px-6 py-8 @container">
            {children}
          </main>
        </div>
      </div>
    </DirectionProvider>
  );
}
```

### 16.2 Sidebar (collapsible, RTL-safe)
```tsx
<aside
  data-collapsed={collapsed}
  className="
    sticky top-0 h-dvh border-s border-border-subtle bg-background
    transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
    w-60 data-[collapsed=true]:w-14
  "
>
  <nav className="flex h-full flex-col gap-1 p-2">
    {items.map(item => (
      <SidebarItem key={item.href} {...item} />
    ))}
  </nav>
</aside>
```

### 16.3 KPI tile (RTL, monospace, sparkline)
```tsx
<div className="rounded-xl border border-zinc-200/70 bg-card p-5
                dark:border-zinc-800 dark:bg-zinc-900
                @container/kpi">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-muted-foreground">درآمد امروز</span>
    <InfoTrigger label="جزئیات درآمد" />
  </div>
  <div className="mt-2 flex items-baseline gap-1">
    <span className="text-3xl font-semibold tracking-tight tabular-nums">۱٬۲۴۲٬۰۰۰</span>
    <span className="text-sm text-muted-foreground">تومان</span>
  </div>
  <div className="mt-3 flex items-center justify-between">
    <ChangePill value={0.124} />  {/* +۱۲٫۴٪ with up-arrow */}
    <Sparkline points={data} className="h-8 w-24 text-emerald-500" />
  </div>
</div>
```

### 16.4 Data table (Linear-style)
```tsx
<div className="overflow-hidden rounded-xl border border-zinc-200/70 dark:border-zinc-800">
  <TableToolbar />  {/* search, filter, density toggle, multi-select actions */}
  <div className="relative">
    <div className="sticky top-0 z-10 flex h-9 items-center border-b border-zinc-200/70
                    bg-background/80 px-3 text-xs font-medium uppercase tracking-wider
                    text-muted-foreground backdrop-blur
                    dark:border-zinc-800 dark:bg-zinc-950/80">
      <CheckboxCell selected={allSelected} onSelect={toggleAll} />
      <ColumnHeader className="flex-1 ps-3 text-start">نام</ColumnHeader>
      <ColumnHeader className="w-32 text-start">وضعیت</ColumnHeader>
      <ColumnHeader className="w-24 text-start">مبلغ</ColumnHeader>
      <div className="w-8" />
    </div>
    <ul role="list" className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
      {rows.map(row => <Row key={row.id} {...row} />)}
    </ul>
  </div>
</div>
```

### 16.5 Command-K
```tsx
'use client';
import { Command } from 'cmdk';

export function CommandPalette() {
  return (
    <Command.Dialog open={open} onOpenChange={setOpen} dir="rtl"
      className="fixed inset-0 z-50 mx-auto mt-24 max-w-xl
                 rounded-xl border border-zinc-200 bg-white p-2 shadow-popover
                 dark:border-zinc-800 dark:bg-zinc-900">
      <Command.Input placeholder="جستجو یا اجرای دستور…"
        className="h-10 w-full bg-transparent px-3 text-sm
                   placeholder:text-zinc-400 focus:outline-none" />
      <Command.List className="max-h-80 overflow-y-auto p-1">
        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
          نتیجه‌ای یافت نشد
        </Command.Empty>
        <Command.Group heading="پیشنهادی"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5
                     [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium
                     [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider
                     [&_[cmdk-group-heading]]:text-muted-foreground">
          {items.map(...)}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

### 16.6 RTL arrow flip
```tsx
const Arrow = ({ className, ...props }) => (
  <svg className={cn(className, 'rtl:scale-x-[-1]')} viewBox="0 0 24 24" {...props} />
);
```

---

## 17. FINAL — "Rules to apply" hand-off to builder agent

> A 2026 admin dashboard in **Next.js + Tailwind v4 + Radix UI + RTL Persian** must follow these rules.

### Layout
1. **Sidebar**: 240px expanded / 56px collapsed, flush with `border-s border-border-subtle`, sticky `h-dvh`. Background = `bg-background` (not `bg-card`).
2. **Top bar**: `h-14` (56px), sticky, `bg-background/80 backdrop-blur border-b border-border-subtle`.
3. **Page**: `px-6 py-8`, max-width `1280px`, `mx-auto`. Use `@container` not breakpoints for inner grids.
4. **Breadcrumb**: `text-xs text-muted-foreground` above page title.

### Tokens (extend existing `globals.css`)
5. Add `--color-canvas`, `--color-surface`, `--color-surface-2`, `--color-border-subtle`, `--color-border-default`, `--color-border-strong` as semantic tokens. Already partially done — finalize.
6. **Radii**: `--radius-sm:6px --radius-md:8px --radius-lg:10px --radius-xl:14px`.
7. **Shadows**: only in dark mode for cards; in light, rely on borders. (No glass blur on cards.)
8. **Easing**: `--ease-out-expo` is the default. Durations: hover 120ms, modal 240/160ms.

### Components
9. **Cards**: `rounded-xl border border-zinc-200/70 bg-white dark:bg-zinc-900 dark:border-zinc-800`. No shadow in light. Hover: bg shift + border darker.
10. **Buttons**: 3 levels (primary black/white, secondary bordered, ghost). Sizes xs/sm/md/lg = h-7/8/9/10. Radius `rounded-md`. Always include `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`.
11. **Tables**: 36px rows (compact) / 44px (comfortable). Sticky header with blur. Multi-select with `space`/`shift+↑↓`/`⌘A`. No row borders — use `divide-y`.
12. **KPI tiles**: `text-3xl font-semibold tracking-tight tabular-nums`, change pill with icon + color, sparkline to the right or below, never both above the number.
13. **Charts**: Recharts/Tremor with `text-zinc-500` axes at 11px, hairline gridlines, mount animation 600ms `ease-out-expo`. Generate series colors with `oklch(0.7 0.15 <hue>)`.
14. **Status**: success/warning/danger/info each = icon + text + color. Never color-only.

### Interaction
15. **Command-K** (`cmdk` + Radix Dialog) is mandatory. Bind to `⌘K`/`Ctrl+K`. RTL-aware (`dir="rtl"`, `align="end"`).
16. **View Transitions** on issue/row → detail navigation (`unstable_ViewTransition` from React).
17. **Skeletons** for any load > 200ms. No centered spinners except full-page.
18. **Optimistic updates** for any CRUD with `useOptimistic` or SWR.
19. **Theme toggle**: Radix Switch with spring animation. Persist in `localStorage` via `next-themes`. Apply `.dark` to `<html>`.
20. **Density toggle** for tables, persisted in localStorage.

### RTL (Persian) — non-negotiable
21. `<html dir="rtl" lang="fa">`. Wrap Radix providers in `<DirectionProvider dir="rtl">`.
22. **Only logical properties**: `ps/pe/ms/me/start/end/border-s/border-e/inset-s/inset-e`. Audit and replace all `pl/pr/ml/mr/left/right`.
23. Vazirmatn Variable via `next/font`. Persist Persian numerals with `Intl.NumberFormat('fa-IR')`.
24. Directional icons flipped with `rtl:scale-x-[-1]` (arrows, chevrons). Status arrows use diagonal variants.
25. Number inputs use `inputmode="decimal"` + plain text + numeral conversion.

### Tailwind v4 specifics
26. Use `@theme` for tokens (extend the existing block). Don't recreate — extend.
27. Use `@container` for inner-grid breakpoints.
28. Use `oklch()` for chart palette generation.
29. Use `color-mix()` only when you need a one-off tinted variant not covered by `bg-x/85`.
30. Register a custom variant: `@custom-variant rtl (&:where([dir="rtl"], [dir="rtl"] *));` so `rtl:scale-x-[-1]` works.

### Accessibility (WCAG 2.2 AA)
31. Focus ring 2px outline + 2px offset, color = `--color-ring` (separate from `--color-accent`).
32. Body text contrast ≥ 4.5:1. Verify with the chosen neutrals (current palette is fine).
33. Live regions for toasts and form errors (`aria-live="polite"`).
34. Touch targets ≥ 24px; aim 40px in admin.
35. Drag-to-reorder MUST have a keyboard alternative (Move up/down menu).
36. `prefers-reduced-motion`: kill all animation/transition durations; for Framer Motion, branch on `useReducedMotion()`.

### Anti-patterns to reject
- ❌ `backdrop-filter: blur` on cards (only OK on top bar / command-K overlay).
- ❌ Pill-shaped (`rounded-full`) primary buttons.
- ❌ Centered spinners as the only loading state.
- ❌ Pure-color status badges (must include icon or text).
- ❌ `outline: none` without replacement.
- ❌ `text-zinc-500` for body copy (below 4.5:1 on canvas in light mode).
- ❌ `pl-/pr-/ml-/mr-/left-/right-` (use logical properties).
- ❌ Borders + shadows together on light-mode cards (one or the other, not both).
- ❌ `transition-all` (always list the properties).
- ❌ Animated gradients on body backgrounds (2024 trend, perf-heavy, dated in 2026).

---

**Document version**: 2026-06-24 · Maintainer: research sub-agent
