# TODO - UI Dark Theme + Stripe-like Menu Animations + Perf/SEO Optimization

## Status: Not started

### Step 1 — Repo understanding (target files)
- [ ] Inspect key layout/theme files: `src/app/layout.tsx`, `src/app/globals.css`, `src/styles/*`
- [ ] Inspect Header/Nav/Menu components: `src/components/Header/*`, `src/components/Nav/*`, `src/components/MenuBar/*`

### Step 2 — Dark-first tokens (linear.app-like)
- [ ] Update RootLayout wrapper to remove hardcoded light background
- [ ] Adjust/extend SCSS theme tokens for dark UI consistency
- [ ] Ensure borders/surfaces/typography match dark glass look

### Step 3 — Stripe-like menu transitions
- [ ] Implement motion primitives for menu open/close
- [ ] Update Header/Nav components to use shared motion helper
- [ ] Respect `prefers-reduced-motion`

### Step 4 — Performance (server/client boundaries)
- [ ] Identify `use client` components in Header/Nav/Motion-related code
- [ ] Convert eligible components to server components
- [ ] Gate framer-motion usage behind client boundaries

### Step 5 — SEO basics + semantics
- [ ] Verify per-page metadata patterns in `src/app/(site)/*`
- [ ] Ensure proper landmarks (header/main/footer) and one `h1` per page

### Step 6 — Testing
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual UI verification (dark theme + menu animations)

