# AGENTS.ui-design.md — UI/UX Design Direction 2026

Load for visual / UX work. Don't load for backend-only tasks.
آخرین به‌روزرسانی: ۲۰۲۶-۰۷-۰۹ (تحقیقات وب ۲۰۲۶ ادغام شد).

## Vibe

Calm Confidence · Human · Premium · Intentional · Lightweight-special.
Extract principles from Linear / Resay / Stripe / Vercel / Raycast / Notion / Cursor / Attio / Mercury / Wise — **never copy the Stripe monoculture** (dark + Inter + monospace + bento without the underlying logic). هویت از منطق دامنه می‌آید، نه از کپی سطح بصری رقیب.

## Every page must have

Visual Focus · Clear Hierarchy · Premium Detail · Memorable Interaction · **State clarity** (current / system / next state visible).

## Allowed

Layered Surfaces · Soft Shadows · Hairline Borders · Subtle Gradients · Ambient Light (thin self-illuminating strokes) · Premium Typography · Depth · **Spring micro-interactions** · **Kinetic SVG** · **Scroll-linked reveals**.

## Forbidden (Anti-2026-Slop)

Neon · Loud colors · Heavy glow · Excessive glassmorphism · Emoji icons · **Lottie runtime** (structural debt, 60–120KB JS) · **Stripe monoculture** (dark+Inter+bento without logic) · **Cubic-bezier-only motion** (feels mechanical in 2026) · decorative full-screen parallax · autoplay video backgrounds · 3 identical rounded cards hero.

## Glass

Only in Header / Modal / Floating Panel / Toolbar. Low blur, low transparency, thin border. Glass shouldn't be the entire design. Prefer **thin ambient SVG strokes** over blur for the "alive but quiet" 2026 look.

## Motion (Functional, not decorative)

- **Purpose only:** confirm action, preserve continuity, guide attention, communicate state. Motion for mood, copy for meaning.
- **Properties:** animate ONLY `opacity` + `transform` (+ `filter` with care). Never `width/height/top/left/margin/padding` (layout thrash).
- **Spring physics:** use mass/stiffness/damping (CSS `linear()`, Motion, React Spring) for buttons/modals/lists — feels alive vs mechanical cubic-bezier.
- **Durations (tokens):** micro 120ms · component 200–300ms · page 300–500ms. Anything >500ms must justify.
- **Easing as verb:** ease-out enter, ease-in exit, ease-in-out between states, linear only for indeterminate loaders.
- **Scroll-linked:** native CSS `scroll-timeline` / `view-timeline` + View Transitions API for shared-element route changes (no JS orchestration).
- **Interruptible:** state drives animation; mid-flight cancel reverses from current frame.
- **prefers-reduced-motion:** honored at root + JS guard for heavy motion.

## Special-but-lightweight effects (the "wow" that stays fast)

1. **Spring tap:** 120ms scale-down-and-back on press (haptic-style, no real haptics).
2. **Kinetic SVG icons:** native SMIL/CSS morph (hamburger→X via node-normalized paths); <15 nodes, `will-change:transform; contain:paint`.
3. **System-breath:** 0.5Hz opacity/stroke-width oscillation on ambient strokes = "interface alive, quiet" (OLED-friendly).
4. **View-Transition drill-down:** card→detail shares element/position (continuity, no pop).
5. **Scroll-reveal:** `view-timeline` fade+translateY on section enter; gated by reduced-motion.
6. **Hairline glow:** 1px border + subtle box-shadow on focus, not heavy glow.
7. **Ambient SVG light:** thin self-illuminating stroke instead of blurred glass blobs.

## Accessibility (WCAG 2.2 AA / EAA 2025)

Semantic HTML · Keyboard nav · Screen reader · Focus management · Proper contrast · **44px touch targets** · reduced-motion · color never sole indicator · `aria-live` for status SVGs.

## Performance

Lazy loading · Code splitting · Image optimization · Font optimization · Caching · Render optimization · **animate transform/opacity only** · avoid Lottie · `content-visibility` on long lists · measure INP on mid-tier Android.

## Pre-delivery checklist

**Visual**: no emoji icons (use kinetic SVG/Lucide); consistent icon sizing (24×24 viewBox); hover uses color/opacity/spring (scale only as press feedback); theme colors direct (`bg-primary`).
**Interaction**: every clickable has `cursor-pointer`; spring/focus feedback; transitions 120–300ms; visible focus ring; tap targets ≥44px.
**Light/dark**: text contrast ≥ 4.5:1 (numbers ≥7:1); glass ≥ `bg-white/80` light; borders visible both; OLED-friendly near-black dark.
**Layout**: floating navbar edge spacing; content not hidden behind fixed navbar; responsive 375/768/1024/1440; mobile designed first, not ported.
**Accessibility**: alt text; labeled inputs; color not sole indicator; reduced-motion variant for every animation; no Lottie.