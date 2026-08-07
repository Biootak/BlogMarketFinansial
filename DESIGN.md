# DESIGN.md — Visual Contract (FinancialMarket)

> Load BEFORE any UI/appearance task, together with `COMPONENTS.md`.
> Source of truth for tokens: `src/components/ds/styles/tokens.css`.
> This is the agent-readable compression of the brand. Keep it scannable; extend, don't bloat.

## ⚠️ UI/UX Pro Max skill — use with override

The `ui-ux-pro-max` skill is installed in `.claude/skills/ui-ux-pro-max/` (Claude Code) and
`.agents/skills/ui-ux-pro-max/` (Bob IDE / universal). **Its default output is amber+violet
Dark OLED with Fira Code — this DOES NOT match our brand.** Our brand is emerald+indigo,
Vazirmatn-first, light+dark, calm confidence.

**Before trusting any `--design-system` output from the skill, read:**

- `design-system/financialmarket/MASTER.md` — project-aligned design system (overrides skill defaults)
- `design-system/financialmarket/pages/[page].md` — per-page overrides if exists

When invoking the skill, always include `--persist -p "FinancialMarket"`, then **cross-check
the generated MASTER.md against this DESIGN.md** and the project tokens before implementing.

## Authority
When sources conflict: (1) existing production components in `src/components/ui` + `src/components/Dashboard/primitives`, (2) tokens in `tokens.css`, (3) `AGENTS.ui-design.md` intent, (4) screenshots/legacy pages (NOT references). Do NOT copy values from screenshots when a token exists.

## Color system (tokens only — NEVER hex/rgb)
- **Site (public):** `--ds-canvas` / `--ds-surface` / `--ds-surface-elevated` / `--ds-surface-recessed`; text `--ds-text-primary|secondary|muted|inverse`; borders `--ds-border-subtle|default|strong`.
- **Brand:** `--ds-brand-500/600/700` (indigo, low-saturation). Reserve for primary action + active state only.
- **Accents (low-sat):** `--ds-accent-amber|emerald|rose|violet|slate` — per-tile semantic use; trend up/down use `--nova-up` / `--nova-down`.
- **Dashboard v2:** `--ds-color-*` (canvas/surface/border/fg) + `--nova-*` scale (primary/ink/muted/line + up/down/flat + per-tile cyan/rose/emerald/violet/amber).
- **shadcn `ui/*`:** carry their own `--color-*` Tailwind theme mapping in `globals.css @theme`. Leave them; do NOT add new `--color-*` custom props in custom code.
- **Forbidden:** any hardcoded hex/rgb; the legacy `--background/--card/--border` rgb channels; new px-fixed colors.

## Typography (fluid, Vazirmatn)
Scale (clamp): xs .75–.81 · sm .875–.94 · base .94–1 · lg 1.06–1.25 · xl 1.25–1.5 · 2xl 1.5–1.875 · 3xl 1.875–2.5 · 4xl 2.25–3rem.
Leading: tight 1.12 · snug 1.45 · normal 1.65 · relaxed 1.75.
Weight: medium 500 · semibold 600 · bold 700 · extrabold 800.
- Use the scale; never assign raw `font-size` in components. Compact app density. Sentence case for Persian UI labels.

## Spacing (fluid, never fixed px where a token exists)
`--ds-space-1` .25–.375 · `2` .5–.75 · `3` .75–1 · `4` 1–1.5 · `5` 1.25–1.75 · `6` 1.5–2.25 · `8` 2–3 · `10` 2.5–3.75rem.
Use layout primitives / containers; avoid repeated margins; no negative margins unless matching an established pattern.

## Radius (geometric ramp)
sm .5 · md .75 · lg 1 · xl 1.25 · 2xl 1.5 · full 9999px rem. Match the ramp; don't invent radii.

## Motion / Duration / Easing
Durations: fast 180 · base 280 · slow 420 · page 600ms. Easing: out-quart `cubic-bezier(.22,1,.36,1)` (primary), out-expo, spring `cubic-bezier(.34,1.56,.64,1)`.
- Animate ONLY `opacity` + `transform` (+ `filter` with care). Never layout props (width/height/top/left/margin/padding).
- Reuse global `anim-*` utilities (`globals.css`): `anim-fade-in-up`, `anim-ping-soft`, `anim-aurora-*`, `stagger-children`. No per-component `@keyframes`/duplicates.
- `prefers-reduced-motion` is globally clamped in `tokens.css:221` — do NOT add a local reduced-motion block.
- Spring micro-interactions (mass/stiffness/damping) for buttons/modals/lists; scroll-linked reveals via `view-timeline`.

## RTL (global)
`html dir="rtl"`. Logical properties only: `ps-/pe-/ms-/me-/inset-inline-start/end`, `text-start/end`. NEVER `left/right`, `ml-/mr-/pl-/pr-/text-left/right`. Editor1 shells/portals use `useDirection('rtl')`.

## Surfaces & depth
- Prefer hairline borders (`--ds-border-*`) + subtle spacing over heavy shadows.
- Shadows allowed: `--ds-shadow-sm|md|lg` (low-sat). Glass only in Header/Modal/Floating/Toolbar — low blur, thin border.
- Ambient "alive but quiet" look via thin self-illuminating SVG strokes / `System-breath` (0.5Hz), not blurred blobs.

## Anti-patterns (forbidden — "2026 slop")
Neon · loud colors · heavy glow · excessive glassmorphism · emoji icons (use Lucide/kinetic SVG) · Lottie runtime · Stripe monoculture (dark+Inter+bento without logic) · cubic-bezier-only mechanical motion · full-screen parallax · autoplay video · 3 identical rounded hero cards · raw `console.log` in UI.

## Accessibility (WCAG 2.2 AA)
Semantic HTML · keyboard nav · visible focus · 44px touch targets · color never sole indicator · `aria-live` for status · contrast ≥4.5:1 (numbers ≥7:1) · reduced-motion variant for every animation.

## Light / Dark
Theme flips in `tokens.css` (`.dark`). Verify both modes; OLED-friendly near-black dark; glass ≥ `bg-white/80` in light.

---

## Craft & Composition (world-class bar)

This is the difference between "works" and "billion-dollar". Follow without exception.

### Layout rhythm
- Content max-width: public **1200px**, dashboard **1440px** container; responsive gutter via `--ds-space-*`. No arbitrary `max-width` literals.
- Vertical section spacing uses the space scale (not ad-hoc margins). 8pt grid. One concern per region.
- **Measure:** body copy 45–75ch; data tables/numbers may use full width.

### Elevation tiers (token-only)
`0` border-only (default) · `1` hover/popover · `2` dialog/drawer · `3` toast/command. Use `--ds-shadow-*`; no custom box-shadow values. Prefer hairline border + spacing over shadow.

### Motion language (named, reuse `anim-*`)
- `enter`: fade + 8px rise, 280ms `out-quart`. `exit`: reverse, 180ms.
- `hover`: translateY(-1px) + border brighten (no color jump). `press`: scale(.98) `spring`.
- `focus`: 2px brand ring (`focus-visible`). `stagger`: 40ms step via `stagger-children`.
- Animate opacity/transform only; reduced-motion is globally clamped — never re-declare it.

### Iconography
`lucide-react` ONLY. Stroke 1.5, sizes 16/20/24 (token), `currentColor` (muted→primary on hover). No emoji, no icon fonts, no mixed icon sets.

### State art-direction (all 5 states required)
- **Empty:** icon/illustration + microcopy + one primary CTA. Never a bare "nothing here".
- **Error:** concise message + retry. Never a stack trace.
- **Loading:** skeleton shimmer (not spinner blocks, not "..."). 
- **Disabled:** reduced opacity + not-allowed, still focusable if recoverable.
- **Success:** subtle check + inline confirmation (no modal for trivial success).

### Data display
`font-variant-numeric: tabular-nums`; in RTL, align numbers to the start; trend via `--nova-up`/`--nova-down`; format decimals/locales; no raw unformatted numbers.

### Performance budgets (Core Web Vitals)
LCP < 2.5s · CLS < 0.1 · INP < 200ms. `next/font` + `Image` + lazy heavy (charts/drawers) + route code-split + no layout shift. Every data read paginated/cached with correct tags.

### SEO
Per-page `metadata` (title/description/openGraph); Persian/`fa-IR` locale + `hreflang`; JSON-LD `Article` for posts.

---

## Specialized layers (expert differentiators — set BEFORE coding)

### Finance semantics (domain-critical — DECIDE ONCE, here)
- **Trend color:** Iran/Afghanistan markets use **green = رشد/مثبت (up), red = افت/منفی (down)** (TSE convention, same as Western). Some Asian markets invert — so make it **locale-switchable via intent mode**, never hardcode.
- Encode ONLY as semantic tokens: `--trend-up` / `--trend-down` (resolved from brand primitives). Candlesticks: up=token-up, down=token-down. Components never name colors.
- **Heatmap:** 5-step magnitude scale per direction (light→dark within ±5% band), neutral grey for flat. Tooltip shows value + time.
- **Numbers:** sign + locale formatting, `tabular-nums`, right-aligned in RTL. Never raw decimals.

### Token architecture (3-tier, intent-based)
- primitive (`--ds-c-*` raw) → semantic (`--ds-surface`, `--ds-text-*`, `--trend-up`) → component (rare, multi-brand only).
- Name by **intent (role + state)**, not value: `--ds-surface-interactive-hover`, not `--indigo-600`.
- **Multi-dimensional theming via cascade:** color-mode (light/dark) · brand (blog / af-finance) · density (comfortable/compact). Compose with `data-*`; components consume semantic only. The repo is **multi-brand** — brand is a theming dimension, NOT a fork.

### Data-viz language (financial charts)
- Axis: hairline gridlines (`--ds-border-subtle`), `tabular-nums` labels, muted ticks. No 3D/glow/neon.
- Series: colorblind-safe categorical palette; trend via `--trend-up/down`.
- Tooltip: `surface-elevated` card (2px border), never browser default.
- Chart states: empty (no-data art) · loading (skeleton) · error (retry).

### Editorial typography (it is a blog)
- Article measure 60–75ch, long-form leading ~1.75. Persian quotes « »; never Latin punctuation inside Persian runs.
- Element kit: h2/h3 anchors · blockquote (inline-start accent border) · `code` (mono, recessed) · tables (bordered + zebra) · figure/figcaption · pull-quote · footnote · TOC · reading-progress bar.
- Images: `next/image` with explicit dimensions (no CLS); caption muted.

### Localization (fa-IR + Afghanistan)
- **Numerals:** decide intentionally — Persian/Arabic-Indic (۱۲۳) vs Latin digits; be consistent project-wide, allow per-locale override.
- **Calendar:** Jalali/Shamsi (`date-fns-jalali`); format `۱۴۰۵/۰۴/۱۸`.
- **Currency:** IRR (تومان grouping) / AFN; symbol placement RTL-aware.
- **RTL+LTR mix:** numbers/Latin wrap in `dir="ltr"` spans; correct `unicode-bidi`.
- Locale-aware collation/sorting.

## Roadmap: from here to billion-dollar

Remaining gaps found in audit → concrete fixes (track as tasks, do not silently skip):

1. **Global CSS monolith** → migrate `dashboard.css` (426KB), `setup.css` (89KB), `auth.css` (39KB) to per-feature CSS Modules; keep only tokens + `anim-*` in `globals.css`. Delete dead `money-transfer/styles.css` (29KB, 0 imports).
2. **~14 parallel modal/dialog systems** → consolidate to `ui/dialog` + `ui/sheet` (Radix). Deprecate `Modal*`, route through one `useDialog` hook.
3. **Duplicate components** (`EmptyState`/`Button`/`Card`/`Input`/`Table`) → single canonical source; delete clones (`DashboardTableWrapper` exports off-limits).
4. **Dead `ds/*`** → freeze; new code only `ui/*` + `Dashboard/primitives`.
5. **Stubs / fake metrics** (`ModalHideAuthor` `console.log`, `getSystemStatus` fabricated CPU/RAM) → real impl or clearly-marked typed interface.
6. **58 `any`/`@ts-ignore` + 239 `console.log`** → eliminated by the `npm run verify` gate.
7. **~140 inline hex** → token migration.
8. **Architecture boundaries** → enforce Server/Client split, data/domain/presentation folders, `loading.tsx`/`error.tsx`/`suspense` boundaries, `'use client'` discipline.
9. **Visual consistency pass** → unify typography/spacing/radius across dashboard + public.
10. **a11y AA audit** → focus order, labels, contrast, live regions, 44px targets.
11. **Performance audit** → bundle/CWV, image optimization, cache-tag correctness.
12. **Testing** → unit (lib), component tests, Playwright E2E smoke for critical flows.
13. **Governance** → component status (stable/beta/deprecated), deprecation-first, contribution workflow, semantic-token lint + contrast check in `npm run verify`.
14. **Living styleguide** → Storybook / token registry + visual regression (Chromatic-style) so the system is self-documenting and drift is caught.
