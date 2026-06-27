# Dashboard v2 Glass + Monochrome Visual Refactor — Implementation Spec

## Goal
Upgrade the existing dashboard v2 surfaces to a premium, light lavender/indigo glass aesthetic and a monochromatic slate control language, without touching grid layout, state logic, or data flow.

## Constraints
- No grid / layout / state logic changes. Only Tailwind utility classes and CSS tokens.
- No new dependencies.
- Preserve existing `--ds-*` CSS tokens; only add new ones if strictly necessary.
- Every visual change must have a `.dark` counterpart.
- Keep logical properties and RTL-safe declarations.
- Do not remove the `.dash-scope` wrapper or the `Dashboard 2026 (June 22)` / `Dashboard 2026 (June 24)` block markers.
- The source-order of the two existing `@layer utilities` blocks must stay intact; overrides live inside the **June 24 foundation block** because it is later in the cascade.

## Verification Strategy
- After each chunk, run `npx next build` (or `npm run lint` as a fast smoke test) and visually inspect `/dashboard` in both light and dark modes.
- Confirm no Tailwind utility is left using `violet-*`, `cyan-*`, `emerald-*`, `amber-*`, or `rose-*` in the dashboard v2 area, except for critical fail states (SystemHealth `fail`).
- Confirm `.dash-pane` elements show `backdrop-filter: blur(24px)` and a translucent white background in light mode.
- Confirm `.dash-side__spotlight` is a white capsule in light mode and a slate capsule in dark mode.
- Note that after the split, Chunk 2a (`KpiGrid`, `ActivityRail`, `SystemHealth`) and Chunk 2b (`PostsSpotlight`, `AnalyticsCanvas`, `EngagementDonut`, `HeroSection`) can be implemented in parallel because they both depend only on Chunk 1 (CSS foundation) being applied first.

## Chunks

### Chunk 1 — CSS Foundation (`src/app/globals.css`)

**Files Changed**
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/app/globals.css`

**Scope**
All style overrides live inside the `Dashboard 2026 (June 24) - Foundation primitives` `@layer utilities` block (line ~9081). Because this block is later in the same `@layer utilities` layer, its rules override the earlier June 22 / Aurora definitions without changing those files.

#### 1.1 Dashboard canvas background (`.dash-scope`)
Location: first `Dashboard 2026 — Fintech Aurora / OLED` block, `.dash-scope` rule.

**Replace** the light-mode `.dash-scope` background:
```css
/* before */
background: oklch(97% 0.003 247);

/* after */
background:
  radial-gradient(120% 120% at 80% 0%, rgba(99, 102, 241, 0.10) 0%, transparent 55%),
  radial-gradient(120% 120% at 0% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 55%),
  linear-gradient(180deg, #f8f9fc 0%, #f3f4f8 100%);
```

**Replace** the dark-mode `.dash-scope` background:
```css
/* before */
background: oklch(12% 0.012 255);

/* after */
background:
  radial-gradient(120% 120% at 80% 0%, rgba(79, 70, 229, 0.16) 0%, transparent 55%),
  radial-gradient(120% 120% at 0% 100%, rgba(124, 58, 237, 0.12) 0%, transparent 55%),
  linear-gradient(180deg, oklch(14% 0.018 255) 0%, oklch(11% 0.015 255) 100%);
```

#### 1.2 Aurora blobs (`.dash-aurora`)
Keep the existing blobs but shift the lower blob from emerald to lavender/indigo so it matches the new canvas.

**Replace** `.dash-aurora::after` background:
```css
/* before */
background: radial-gradient(closest-side, oklch(68% 0.13 165 / 0.40), transparent 70%);

/* after */
background: radial-gradient(closest-side, oklch(65% 0.14 285 / 0.35), transparent 70%);
```

#### 1.3 Card glass layer (`.dash-pane`)
Location: June 22 block, `.dash-pane` rule (line ~8604).

**Replace** the base `.dash-pane` surface declaration block (keep all other layout/transition properties):
```css
/* before */
background: oklch(100% 0 0);
border: 1px solid oklch(92% 0.004 245 / 0.6);
box-shadow: 0 1px 3px 0 oklch(20% 0.02 250 / 0.04), 0 1px 2px -1px oklch(20% 0.02 250 / 0.03);

/* after */
background: rgba(255, 255, 255, 0.5);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border: 0.5px solid rgba(255, 255, 255, 0.6);
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.03);
```

**Replace** `.dash-pane:hover` border:
```css
/* before */
border-color: oklch(88% 0.008 245 / 0.8);

/* after */
border-color: rgba(255, 255, 255, 0.8);
```

**Replace** `.dark .dash-pane`:
```css
/* before */
background: oklch(18% 0.012 255);
border-color: oklch(30% 0.015 255 / 0.5);
box-shadow: 0 1px 3px 0 oklch(0% 0 0 / 0.2), 0 1px 2px -1px oklch(0% 0 0 / 0.15);

/* after */
background: rgba(15, 23, 42, 0.4);
border-color: rgba(255, 255, 255, 0.05);
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15);
```

**Replace** `.dark .dash-pane:hover` border:
```css
/* before */
border-color: oklch(38% 0.018 255 / 0.6);

/* after */
border-color: rgba(255, 255, 255, 0.10);
```

#### 1.4 Nested panel fill utility (new `.dash-pane__fill`)
Add to the June 24 utilities block:
```css
.dash-pane__fill {
  background: rgba(255, 255, 255, 0.8);
  border: 0.5px solid rgba(255, 255, 255, 0.8);
  border-radius: var(--ds-radius-lg, 0.625rem);
}
.dark .dash-pane__fill {
  background: rgba(15, 23, 42, 0.55);
  border-color: rgba(255, 255, 255, 0.06);
}
```

#### 1.5 Icon neutralization (`.dash-ico` / `.dash-ico--*`)
Add overrides inside the June 24 block. These neutralize the per-tone rules defined in the earlier Aurora block.

```css
.dash-ico {
  background: rgba(51, 65, 85, 0.10); /* slate-700/10 */
  color: rgba(51, 65, 85, 0.80);      /* slate-700/80 */
}
.dark .dash-ico {
  background: rgba(148, 163, 184, 0.12); /* slate-400/12 */
  color: rgba(203, 213, 225, 0.85);      /* slate-300/85 */
}

.dash-ico--indigo,
.dash-ico--emerald,
.dash-ico--cyan,
.dash-ico--violet,
.dash-ico--rose,
.dash-ico--amber {
  background: rgba(51, 65, 85, 0.10);
  color: rgba(51, 65, 85, 0.80);
}
.dark .dash-ico--indigo,
.dark .dash-ico--emerald,
.dark .dash-ico--cyan,
.dark .dash-ico--violet,
.dark .dash-ico--rose,
.dark .dash-ico--amber {
  background: rgba(148, 163, 184, 0.12);
  color: rgba(203, 213, 225, 0.85);
}
```

#### 1.6 Trend pill neutralization (`.dash-trend`)
Add overrides inside the June 24 block:

```css
.dash-trend--up,
.dash-trend--down,
.dash-trend--flat {
  color: rgba(51, 65, 85, 0.80);
  background: rgba(100, 116, 139, 0.10);
}
.dark .dash-trend--up,
.dark .dash-trend--down,
.dark .dash-trend--flat {
  color: rgba(203, 213, 225, 0.85);
  background: rgba(148, 163, 184, 0.12);
}
```

#### 1.7 Metadata chip typography (`.dash-pane__chip`)
Location: June 22 block.

**Replace** the color declarations only:
```css
/* before */
color: oklch(40% 0.02 250);

/* after */
color: rgb(100, 116, 139); /* text-slate-500 */
```

```css
/* before */
.dark .dash-pane__chip { color: oklch(85% 0.02 245); }

/* after */
.dark .dash-pane__chip { color: rgb(148, 163, 184); /* text-slate-400 */ }
```

Keep `font-size: 0.6875rem;` (≈ 11px) and existing `font-weight: 700`.

#### 1.8 Metadata sub-label typography (`.dash-pane__sub`)
Location: June 22 block; typically nested under pane headers or stat blocks.

**Replace** the color declarations only:
```css
/* before */
color: oklch(45% 0.02 250);

/* after */
color: rgb(100, 116, 139); /* text-slate-500 */
```

```css
/* before */
.dark .dash-pane__sub { color: oklch(75% 0.02 245); }

/* after */
.dark .dash-pane__sub { color: rgb(148, 163, 184); /* text-slate-400 */ }
```

Keep `font-size: 0.6875rem;` (≈ 11px). If `font-weight` is currently bold/heavy, leave it unchanged to preserve hierarchy.

#### 1.9 Card-link metadata typography (`.dash-cardlink__meta`)
Location: June 22 block; used for counters, timestamps, or secondary labels inside `.dash-cardlink` rows.

**Replace** the color declarations only:
```css
/* before */
color: oklch(50% 0.02 250);

/* after */
color: rgb(100, 116, 139); /* text-slate-500 */
```

```css
/* before */
.dark .dash-cardlink__meta { color: oklch(80% 0.02 245); }

/* after */
.dark .dash-cardlink__meta { color: rgb(148, 163, 184); /* text-slate-400 */ }
```

Keep `font-size: 0.6875rem;` (≈ 11px) where present.

**Note on title hierarchy**: `.dash-cardlink__title` and `.dash-pane__title-text` should be audited but **not** lightened if they already use a heavy/primary foreground color. The goal is to mute metadata, not weaken titles.

#### 1.10 Card-link row backgrounds (`.dash-cardlink`)
Location: June 22 block.

**Replace** hover backgrounds so rows stay glassy:
```css
/* before */
.dash-cardlink:hover { background: oklch(96% 0.004 245 / 0.75); }
.dark .dash-cardlink:hover { background: oklch(26% 0.014 250 / 0.55); }

/* after */
.dash-cardlink:hover { background: rgba(255, 255, 255, 0.60); }
.dark .dash-cardlink:hover { background: rgba(15, 23, 42, 0.35); }
```

#### 1.11 Sidebar active spotlight capsule (`.dash-side__spotlight`)
Location: Sidebar surface block (inside `globals.css`).

**Replace**:
```css
/* before */
.dash-side__spotlight {
  ...
  background: var(--ds-color-side-active-bg);
  border: 1px solid oklch(70% 0.08 250 / 0.12);
  ...
}
.dark .dash-side__spotlight {
  background: var(--ds-color-side-active-bg);
  border-color: oklch(55% 0.06 250 / 0.18);
}

/* after */
.dash-side__spotlight {
  ...
  background: rgba(255, 255, 255, 1);
  border: 0.5px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 1px 3px 0 rgba(31, 38, 135, 0.05), 0 1px 2px -1px rgba(31, 38, 135, 0.03);
  ...
}
.dark .dash-side__spotlight {
  background: rgba(30, 41, 59, 0.85); /* slate-800/85 */
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.20);
}
```

**Add** active icon color override:
```css
.dash-side__item[data-active="true"] .dash-side__item-ico {
  color: rgba(51, 65, 85, 0.80);
}
.dark .dash-side__item[data-active="true"] .dash-side__item-ico {
  color: rgba(203, 213, 225, 0.85);
}
```

**Accept When**
1. DevTools shows `.dash-pane` with `background: rgba(255,255,255,0.5)`, `backdrop-filter: blur(24px)`, and the indigo/lavender radial gradients behind it.
2. All six `.dash-ico--*` variants render the same slate background.
3. `.dash-side__spotlight` is a white rounded capsule in light mode and a slate rounded capsule in dark mode.
4. `.dash-trend--up`, `--down`, and `--flat` share the same neutral slate color.
5. `.dash-pane__sub` and `.dash-cardlink__meta` render as `text-slate-500` in light mode and `text-slate-400` in dark mode at `0.6875rem` (≈ 11px).
6. Title elements (`.dash-cardlink__title`, `.dash-pane__title-text`) retain their existing weight/hierarchy and are not lightened.

**Complexity**: `complex` — CSS architecture decision, cascade ordering, and dark-mode handling.

**Open Questions**: None.

---

### Chunk 2a — Metric-Control Inline Touch-ups

**Files Changed**
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/KpiGrid.tsx`
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/ActivityRail.tsx`
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/SystemHealth.tsx`

**Depends On**
- Chunk 1 (CSS foundation)

**Parallelizable**: `true` — can run concurrently with Chunk 2b.

#### 2a.1 `KpiGrid.tsx` — `DeltaBadge`
Find the `pillCls` ternary and replace it with a single neutral string:
```tsx
// before
const pillCls = isUp
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
    : isDown
      ? 'text-rose-700 dark:text-rose-400 bg-rose-500/10'
      : 'text-slate-600 dark:text-slate-400 bg-slate-500/10';

// after
const pillCls = 'text-slate-700/80 dark:text-slate-300/80 bg-slate-500/10 dark:bg-slate-500/10';
```

The `dash-ico--rose/emerald/violet/amber/cyan` classes on `<CompactPane>` and the hero pane do **not** need to change; Chunk 1 CSS neutralizes them.

#### 2a.2 `ActivityRail.tsx`
- **TONE_DOT mapping** — replace every color with slate:
```tsx
// before
const TONE_DOT: Record<ReturnType<typeof actionTone>, string> = {
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

// after
const TONE_DOT: Record<ReturnType<typeof actionTone>, string> = {
  violet: 'bg-slate-600/80 dark:bg-slate-300/80',
  cyan: 'bg-slate-600/80 dark:bg-slate-300/80',
  emerald: 'bg-slate-600/80 dark:bg-slate-300/80',
  amber: 'bg-slate-600/80 dark:bg-slate-300/80',
  rose: 'bg-slate-600/80 dark:bg-slate-300/80',
};
```

- **Day-group header** — bump metadata size/color:
```tsx
// before
<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">

// after
<p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
```

- **Footer link** — neutralize:
```tsx
// before
className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-xs font-semibold ... focus-visible:ring-violet-400/60"

// after
className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-700 dark:text-slate-300 text-xs font-semibold ... focus-visible:ring-slate-400/60"
```

#### 2a.3 `SystemHealth.tsx`
- **Overall status pill** — only fail stays rose:
```tsx
// before (overallTone ternary)
overallTone === 'ok'
  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  : overallTone === 'stale'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : overallTone === 'fail'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300'

// after
overallTone === 'fail'
  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  : 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300'
```

- **Overall status dot** — only fail stays rose:
```tsx
// before
overallTone === 'ok'
  ? 'bg-emerald-500'
  : overallTone === 'stale'
    ? 'bg-amber-500'
    : overallTone === 'fail'
      ? 'bg-rose-500'
      : 'bg-slate-400 animate-pulse'

// after
overallTone === 'fail' ? 'bg-rose-500' : 'bg-slate-400 animate-pulse'
```

- **Row icon container** — only fail stays rose:
```tsx
// before
rowTone === 'ok'
  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  : rowTone === 'stale'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : rowTone === 'fail'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      : 'bg-slate-100 text-slate-500 dark:bg-slate-800/70 dark:text-slate-400'

// after
rowTone === 'fail'
  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  : 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-400'
```

- **Row value text** — only fail stays rose:
```tsx
// before
rowTone === 'ok'
  ? 'text-emerald-700 dark:text-emerald-300'
  : rowTone === 'stale'
    ? 'text-amber-700 dark:text-amber-300'
    : rowTone === 'fail'
      ? 'text-rose-700 dark:text-rose-300'
      : 'text-slate-500 dark:text-slate-400'

// after
rowTone === 'fail'
  ? 'text-rose-700 dark:text-rose-300'
  : 'text-slate-700 dark:text-slate-300'
```

- **Row background** — switch to the new nested fill utility:
```tsx
// before
className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 bg-slate-50/70 dark:bg-slate-800/40"

// after
className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 dash-pane__fill"
```

- **Stale warning banner** — demote to slate per "only fail is rose":
```tsx
// before
className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 mt-1"

// after
className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 mt-1"
```

---

### Chunk 2b — Navigation / Link / Decoration Inline Touch-ups

**Files Changed**
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/PostsSpotlight.tsx`
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/AnalyticsCanvas.tsx`
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/EngagementDonut.tsx`
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/HeroSection.tsx`

**Depends On**
- Chunk 1 (CSS foundation)

**Parallelizable**: `true` — can run concurrently with Chunk 2a.

#### 2b.1 `PostsSpotlight.tsx`
- **Featured rank badge** — neutral slate:
```tsx
// before
className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow"

// after
className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-slate-700 text-white shadow-sm dark:bg-slate-300 dark:text-slate-900"
```

- **Featured views chip** — neutralize:
```tsx
// before
className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300 tabular-nums"

// after
className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700/80 dark:text-slate-300/80 tabular-nums"
```

- **Featured card body** — use the nested fill utility instead of a gradient:
```tsx
// before
className="group relative block h-full rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-800/10 p-4 transition-[border-color,box-shadow] duration-200 hover:border-violet-300/70 dark:hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"

// after
className="group relative block h-full rounded-2xl dash-pane__fill p-4 transition-[border-color,box-shadow] duration-200 hover:border-white/90 dark:hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
```

- **Header "همه پست‌ها" link** — neutralize:
```tsx
// before
className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold ... focus-visible:ring-violet-400/60"

// after
className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-700 dark:text-slate-300 text-sm font-semibold ... focus-visible:ring-slate-400/60"
```

- **Panel wrapper** — use nested fill utility:
```tsx
// before (Panel article)
<article className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden bg-white/60 dark:bg-slate-900/40">

// after
<article className="rounded-2xl dash-pane__fill overflow-hidden">
```

- **Panel "مشاهده همه" link** — neutralize both branches:
```tsx
// before
const link =
  tone === 'violet'
    ? 'text-violet-600 hover:text-violet-700 dark:text-violet-400 focus-visible:ring-violet-400/60'
    : 'text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 focus-visible:ring-cyan-400/60';

// after
const link =
  'text-slate-600 hover:text-slate-700 dark:text-slate-300 focus-visible:ring-slate-400/60';
```

- **List-row view count** — neutralize:
```tsx
// before
className="text-violet-600 dark:text-violet-400 font-semibold"

// after
className="text-slate-600 dark:text-slate-400 font-semibold"
```

- **Panel icons** (`dash-ico--violet` / `dash-ico--cyan`) are neutralized by Chunk 1 CSS; no inline change needed.

#### 2b.2 `AnalyticsCanvas.tsx`
- **Period switcher focus ring**:
```tsx
// before
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60'

// after
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60'
```

- **Tabs trigger focus ring**:
```tsx
// before
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60'

// after
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60'
```

- **Header "گزارش کامل" link**:
```tsx
// before
className="hidden md:inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold ... focus-visible:ring-violet-400/60"

// after
className="hidden md:inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-700 dark:text-slate-300 text-sm font-semibold ... focus-visible:ring-slate-400/60"
```

#### 2b.3 `EngagementDonut.tsx`
- Replace the legend row hover/active backgrounds with the cleaner nested fill:
```tsx
// before
className={cn(
  'w-full text-start flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors',
  active
    ? 'bg-slate-100 dark:bg-slate-800/70'
    : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40',
)}

// after
className={cn(
  'w-full text-start flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors',
  active
    ? 'bg-white/80 dark:bg-slate-900/40'
    : 'hover:bg-white/60 dark:hover:bg-slate-900/30',
)}
```

The donut slice colors are data-visualization colors and should remain untouched.

#### 2b.4 `HeroSection.tsx`
- **Word-reveal name text** — replace the cyan/emerald gradient with plain slate/white text in both modes (monochrome control shift):
```tsx
// before
className="bg-gradient-to-l from-white via-cyan-100 to-emerald-100 bg-clip-text text-transparent dash2-word-reveal"

// after
className="text-white dash2-word-reveal dark:text-slate-200"
```

- **Primary CTA focus ring**:
```tsx
// before
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 ...'

// after
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80 focus-visible:ring-offset-2 ...'
```

- **Shortcut buttons focus ring**:
```tsx
// before
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 cursor-pointer'

// after
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 cursor-pointer'
```

**Accept When**
1. `KpiGrid` delta badges are all the same slate tone; up/down still distinguished by arrow icon.
2. `ActivityRail` timeline dots are slate in every activity tone.
3. `SystemHealth` shows rose only when `overallTone === 'fail'`; all other states use slate.
4. `PostsSpotlight` featured rank badges, view chips, and header links are slate/neutral; no violet/cyan links remain.
5. `AnalyticsCanvas` and `HeroSection` no longer reference violet/cyan focus rings or text colors.
6. `HeroSection` name text is plain white in light mode and `slate-200` in dark mode, with no cyan/emerald gradient.

**Complexity**: `simple` — mechanical class swaps inside unchanged JSX structures.

**Open Questions**: None.

## Out of Scope
- `src/components/Dashboard/DashboardPage/Header.tsx` — persistent global header (theme toggle, avatar, notifications) outside the dashboard v2 bento. Not in scope for this refactor.

---

### Chunk 3 — Sidebar Avatar Role Dot Neutralization

**Files Changed**
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/Sidebar.tsx`

#### 3.1 Replace `ROLE_TONE` mapping
The sidebar uses a per-role gradient for the small status dot next to the avatar. Replace the entire mapping with a single neutral class.

```tsx
// before
const ROLE_TONE: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-gradient-to-br from-rose-500 to-pink-600',
  ADMIN: 'bg-gradient-to-br from-violet-500 to-purple-600',
  AUTHOR: 'bg-gradient-to-br from-amber-500 to-orange-500',
  USER: 'bg-gradient-to-br from-slate-500 to-gray-600',
};

// after
const ROLE_TONE: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-slate-500 dark:bg-slate-400',
  ADMIN: 'bg-slate-500 dark:bg-slate-400',
  AUTHOR: 'bg-slate-500 dark:bg-slate-400',
  USER: 'bg-slate-500 dark:bg-slate-400',
};
```

The active item spotlight stays CSS-only (Chunk 1 `.dash-side__spotlight`), so no JS change is required there.

#### 3.2 Sidebar role label size (optional micro-typography)
If the builder notices the role label inside `.dash-side__user-role` is too heavy, keep it as-is; the existing `font-size: 0.625rem` and `color: var(--ds-color-fg-subtle)` already satisfy the metadata constraint.

**Accept When**
1. The avatar dot in the sidebar is slate for every user role.
2. No gradient role-tone classes remain in `Sidebar.tsx`.
3. Active sidebar item still shows the Chunk-1 white/slate capsule.

**Complexity**: `simple` — mechanical class swap.

**Open Questions**: None.

## Decision Log
| Decision | Rationale | Rejected Alternative |
|---|---|---|
| Apply all pane/icon glass changes via CSS overrides in the June 24 block | Avoids touching 10 component files for the same rule; keeps component JSX focused on data | Editing every `dash-pane`/`dash-ico` instance inline |
| Keep up/down semantic meaning only through the arrow icon, not color | Matches the "monochromatic control shift" requirement while preserving accessibility | Removing the arrow and making the badge completely identical |
| Restrict rose to only `fail` state in `SystemHealth` | Explicitly matches the user's "only critical fail state (rose)" instruction | Keeping amber for stale or emerald for ok |
| Leave donut slice colors unchanged | Slice colors are data-visualization encodings, not UI control accents | Neutralizing all chart colors |
| Use `dash-pane__fill` utility for nested panels | Reusable, single-source backing that gets dark mode for free | Inline `bg-white/80` on every nested card |
| Replace `HeroSection` name gradient with plain slate/white text | The gradient is decorative (not a KPI badge or sidebar link), but its cyan→emerald accent violates the monochrome goal. Plain text respects both light and dark modes. | Keeping the gradient and adding an explicit `dark:` variant (Option B) |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Glass `backdrop-filter: blur(24px)` hurts low-end GPU scrolling | Medium | The existing `.dash-pane` already uses `content-visibility: auto`; if jank appears, reduce blur to `18px` but keep the translucent background. |
| White sidebar spotlight fails on very light backgrounds | Low | The sidebar itself uses a tinted surface (`--ds-color-side`) distinct from the main canvas, and Chunk 1 adds a subtle shadow to the spotlight. |
| Removing `violet`/`cyan` from `PostsSpotlight` links reduces perceived "primary action" affordance | Low | The "همه پست‌ها" / "مشاهده همه" links remain underlined-by-hover and semantically placed; if needed, add a single `text-slate-700` bold weight without reintroducing color. |

## Critical Files for Implementation
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/app/globals.css` — all glass, icon, trend, chip, sub-label, card-link-meta, and sidebar-spotlight overrides.
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/SystemHealth.tsx` — biggest inline color-state cleanup (Chunk 2a).
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/PostsSpotlight.tsx` — featured cards and panel links (Chunk 2b).
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/v2/HeroSection.tsx` — name text and focus-ring neutralization (Chunk 2b).
- `/mnt/c/Users/Biotak/Desktop/FinancialMarket/src/components/Dashboard/DashboardPage/Sidebar.tsx` — role dot neutralization (Chunk 3).

SPEC_PATH: /mnt/c/Users/Biotak/Desktop/FinancialMarket/.kimchi/docs/dashboard-glass-refactor.md
