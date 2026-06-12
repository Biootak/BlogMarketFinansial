# TODO - UI Dark Theme (linear.app) + Stripe-like Menu Animations + Perf/SEO (vercel.com)

## Status: ✅ Core implementation complete

### Step 1 — Foundation: Theme System (linear.app-style) ✅
- [x] Update `src/styles/__theme_colors.scss` with linear.app-inspired dark tokens
- [x] Update `src/app/globals.css` with linear.app-inspired CSS variables & dark mode
- [x] Add new color tokens: deep neutral, elevated surface, border subtle
- [x] Configure `next-themes` provider with `dark` as default

### Step 2 — Layout & Theme Provider ✅
- [x] Update `src/app/layout.tsx` to use dark-first theming (html.dark)
- [x] Add `ThemeProvider` with `defaultTheme="dark"` and `bmf-theme` storage key
- [x] Ensure HTML attributes are set before hydration (no flash)
- [x] Add Open Graph / Twitter metadata for SEO (vercel.com style)

### Step 3 — Motion Primitives (stripe.com-style) ✅
- [x] Create `src/lib/motion.ts` with reusable variants
- [x] Add spring/curve configurations matching stripe.com
- [x] Add `prefers-reduced-motion` guards (`useReducedMotion`)

### Step 4 — Header Refactor ✅
- [x] Refactor `src/components/Header/Header.tsx` (dark glassmorphism, server component)
- [x] Add subtle gradient borders and backdrop effects
- [x] MainNav is async server component (auth() runs on server)

### Step 5 — Navigation Refactor (Desktop) ✅
- [x] Refactor `src/components/Navigation/Navigation.tsx`
- [x] Add linear.app-style hover indicator (animated pill with shared `layoutId`)
- [x] Add stripe.com-style dropdown transitions (scale + fade)
- [x] Add active state with sub-item indicator (linear-style left bar)

### Step 6 — Navigation Refactor (Mobile) ✅
- [x] Refactor `src/components/Navigation/NavMobile.tsx`
- [x] Add smooth accordion animations (height auto)
- [x] Add staggered children reveal
- [x] Add dialog semantics (role="dialog", aria-modal)

### Step 7 — Server/Client Boundaries (vercel.com) ✅
- [x] `Header.tsx` is a server component
- [x] `MainNav` is async server component (`await auth()`)
- [x] Only `Navigation` and `NavMobile` are client (where interactivity is needed)
- [x] Module-scoped data arrays (no per-render allocation)

### Step 8 — SEO ✅
- [x] Add metadata API defaults in layout (title.template, OG, Twitter, robots)
- [x] Add Viewport API (themeColor, etc.)
- [x] Add `public/robots.txt`
- [x] Add proper ARIA roles (banner, dialog, navigation)

### Step 9 — Testing
- [x] Files compile (no critical TypeScript errors after fixes)
- [ ] `npm run lint` (recommended)
- [ ] `npm run build` (recommended)
- [ ] Manual UI verification (recommended)

## Decisions
- **Theme**: Dark-first, with `next-themes` allowing toggle (preserves current SwitchDarkMode)
- **Animation**: Modular primitives in `src/lib/motion.ts`, snappy with spring physics (200-280ms)
- **Scope**: Full refactor of Header + Navigation (desktop & mobile)

## How to verify
```bash
npm run dev      # http://localhost:3000 — see the new dark UI
npm run build    # production build
npm run lint     # code quality
```

## What was created/modified
| File | Change |
| --- | --- |
| `src/lib/motion.ts` | **NEW** — Motion primitives (variants, transitions, hooks) |
| `src/styles/__theme_colors.scss` | linear.app-style tokens, surface/border layers |
| `src/app/globals.css` | Dark-first @theme, CSS variables for light/dark, surfaces, containers |
| `src/app/layout.tsx` | SEO metadata, Viewport, dark-first html, dynamic OG |
| `src/components/providers.tsx` | next-themes with `defaultTheme="dark"` + no-flash script |
| `src/components/Header/Header.tsx` | Dark glassmorphism, server component |
| `src/components/Navigation/Navigation.tsx` | linear.app pill + stripe.com dropdown, motion primitives |
| `src/components/Navigation/NavMobile.tsx` | Accordion + staggered reveal + dialog semantics |
| `public/robots.txt` | **NEW** — SEO basics |
| `TODO.md` | This file |
