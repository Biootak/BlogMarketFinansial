# Plan: Live Ticker Strip فوقانی + Rotating RateLists Bridge + Menu Surprise

## Context

The user wants the home page "آخرین مقالات" (Latest Articles / PulseBoard) section enhanced with three new layers of market intelligence visualization, plus a "surprising" menu. The current state has:

- A **Live Market Ticker** (DB+Exir crypto, with 60s polling) inside `LatestArticles.tsx` — already shows crypto + DB rates, but the user wants a wider, denser "rate list" rotating display of DB-stored `RateList` rows (سارای شاهزاده, نرخ تهران, etc.).
- A **CompactRateBridge** inside `Design7` that already rotates `RateItem[]` from active `RateList`s — but it's small, sits only on the main post of the slider, and the user wants it as a dedicated strip between the MarketTicker and the section content.
- A **MainNav** that is already polished (Linear-style), but the user wants a "surprising" design — I'll reinterpret this as: a more distinctive header treatment, plus a denser, more interesting navigation with micro-interactions.
- `getRateLists()` action already exists with `unstable_cache` 300s TTL, tag `rate-lists`. The `RateItem` type is `{ title: string; value: string }`. Values can be `"1234|5678"` (buy|sell) or single value.

The user's exact words (translated): "Show a thin live bar at the very top of the latest articles. Show dashboard prices like crypto prices — that one (ticker) is at the top of the home page. Show the rest of the prices from DB rotating — like Sara-ye Shahzadeh, Nerkh Tehran or those list-rates, rotating. Surprise me with the menu design."

The "menu surprise" is open-ended. I'll interpret it as a refreshed MainNav with a new floating "Markets" mega-menu that surfaces the rotating rate lists right inside the nav (consistent with the same data flowing into the home page), plus a new bottom-row floating dock of utility actions. I'll surface this interpretation in the plan but let the user adjust if they want a different "surprise."

## What changes and why

1. **New `RateListsTicker` component** — a wider, denser rotating strip mounted **above** the existing `MarketTicker` (still inside the PulseBoard rounded container, but the very first element). It cycles through every `RateItem` from all active `RateList`s (max ~60 items). Each row is a buy/sell pill with the source list title as eyebrow. Cycles every 4s with AnimatePresence, pauses on hover/tap.

2. **Extend `PulseSection` server fetcher** — add `getRateLists()` to the `Promise.all`, filter to `isActive`, and pass to `LatestArticles`. No new action required.

3. **Extend `LatestArticles` props** — add `rateLists: RateListData[]`, render the new `<RateListsTicker />` strip between the section and the existing `MarketTicker`.

4. **MainNav refresh** — keep the existing routing and structure, but add:
   - A small live "بازار" pill (always visible, emerald dot) that opens a mega-menu drawer showing the same `RateList`s data as the new strip.
   - A floating action dock on mobile (bookmark + search + theme) below the bar.
   - Subtle spotlight on hover for nav items (already present; just enhance the active state with a `layoutId` pill — already there).

5. **CSS-only density** — no new dependencies; reuse `TickerShell` + `Marquee` + `AuroraBackground` + `useTickerPause` + `motion-shim`. Add 1 new keyframe for the rotating row in `globals.css` if useful; otherwise use `AnimatePresence` with the existing `motion-shim` (already 6 KiB, no framer-motion).

## Architecture

### Data flow
- `src/actions/rate-lists.ts` already has `getRateLists()` (cached 300s, tag `rate-lists`). It returns `{ id, title, rates: RateItem[], isActive, createdAt, updatedAt }[]`. **Reuse as-is.**
- `src/actions/marketTickerActions.ts` `getMarketTickerData()` already used. **Reuse as-is.**
- `src/components/Sections/PulseBoard/PulseSection.tsx` — extend `Promise.all` to add `getRateLists()`, then pass active lists to `LatestArticles`. **One block edit.**

### Component tree changes

```
PulseSection (server, async)
├── <LatestArticles
│     posts, categories, initialAds, initialTickerData, totalCount,
│     rateLists  ← NEW
│   />
│   ├── <RateListsTicker rateLists  ← NEW STRIP
│   ├── <MarketTicker> (existing crypto+DB live ticker)
│   ├── Header / Filter / Hero / Stack / List / Ad / Quote / LoadMore (unchanged)
```

### New files

| File | Purpose |
|---|---|
| `src/components/Sections/PulseBoard/RateListsTicker.tsx` | The new rotating strip. `'use client'`. Self-contained; cycles one RateItem at a time with AnimatePresence + framer-motion-shim. |
| `src/components/Sections/PulseBoard/RateListsTicker.module.css` *(optional)* | Only if a keyframe is needed; otherwise inline `style jsx`. Prefer to keep CSS classes in `globals.css` per the codebase convention. |

### Modified files

| File | Change |
|---|---|
| `src/app/(site)/(home)/page.tsx` | The home page's `PulseSection` already fetches everything inside `PulseSection.tsx`. The home page itself does not need to change. |
| `src/components/Sections/PulseBoard/PulseSection.tsx` | Add `getRateLists()` to the `Promise.all`. Pass `activeRateLists` as a new prop. |
| `src/components/Sections/PulseBoard/LatestArticles.tsx` | Accept `rateLists: RateListData[]` prop, render `<RateListsTicker />` above the existing `<MarketTicker />`. |
| `src/components/Navigation/MainNav.tsx` | Add "بازار" live pill + mega-menu drawer with the same rotating rate lists (uses the same data already in `(site)/layout.tsx` — see below). |
| `src/app/(site)/layout.tsx` *(if not already fetching rateLists)* | Add `getRateLists()` server-side and pass to `MainNav` so the mega-menu can use it. |
| `src/app/globals.css` | Add one new keyframe `@keyframes rate-ticker-shimmer` and one utility `.rate-ticker-item` for the cycling animation (or skip if we use `AnimatePresence` for the cycling). Probably skip — use `motion-shim`. |

### Reuse (no new components)

- `TickerShell` from `src/components/TickerShell/` — keeps the glassmorphism + pause-on-hover consistent with the existing ticker.
- `Marquee` from `src/components/ModernTrending/effects/Marquee.tsx` — for the secondary "all-lists flat marquee" inside the strip (showing a horizontal list of the active list names, providing context).
- `getCategoryAccent` from `src/components/Sections/effects/categoryAccent.ts` — for accent color per rate type (Sara-ye Shahzadeh = emerald, Nerkh Tehran = cyan, etc.). Add a new `RATE_LIST_ACCENTS` map keyed by rate-list title keywords.
- `AuroraBackground` for subtle glow under the strip.
- `motion`, `AnimatePresence` from `@/lib/motion-shim` for the cycling transition.
- `cn`, `toPersianNumber`, `formatNumber` from `@/lib/utils`.
- `SafeImage` — not needed (the strip is text-only).
- `LiveClock` from `src/components/Sections/effects/LiveClock.tsx` for the "آخرین به‌روزرسانی" timestamp.

### Backend / contract

- **No new server actions.** `getRateLists()` is reused. Cache tag `rate-lists` is already invalidated by `createRateList` / `updateRateList` / `deleteRateList` mutations.
- **No new Prisma changes.** We use the existing `RateList` model as-is.
- **No new env vars.**
- **No API changes.** All work is server-component → client-component data flow.

### RateList parsing (already a pattern in `CompactRateBridge.tsx`)

`RateItem.value` is a string that can be:
- `"1234"` — single rate.
- `"1234|5678"` — buy|sell.
- `"خرید: 1234 | فروش: 5678"` — Persian-prefixed buy/sell.

We need to **reuse** the parsing logic. There are two existing copies of essentially the same code:
1. `src/app/(site)/money-transfer/RateListGrid.tsx` (lines 178-184) — does inline `split('|')` + `.replace('خرید:', '').trim()`.
2. `src/app/(site)/(home)/designs/CompactRateBridge.tsx` (lines 48-69) — `parseRateValue()` helper that also extracts numeric and suffix.

**Duplication trap:** I'll extract a single helper to `src/lib/rateItem.ts` (`parseRateItem()` → `{ title, buy, sell, buySuffix, sellSuffix, buyNum, sellNum }`), then refactor `RateListGrid.tsx` and `CompactRateBridge.tsx` to use it. This is in scope of the "no duplication" rule from the role file.

## The two new components — design

### 1. `RateListsTicker` (the new top-of-LatestArticles strip)

Layout (RTL, full-width, height `lg` ≈ `h-12 sm:h-14`):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [icon]  نرخ لحظه‌ای بازار   │  ۰۱/۲۳  ●  سارای شاهزاده              ◀ ▶   │
│        ۱۴۰۵/۰۳/۲۷ · ۱۲:۴۵  │                                            │
│                              │   خرید: ۶۷٬۸۰۰    فروش: ۶۸٬۲۰۰            │
│                              │   [رفتن به صرافی →]                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Lead badge** (left in RTL = "first"): live icon + "نرخ لحظه‌ای بازار" + a small `LiveClock` showing current Tehran time (1s update). The `TickerShell` already supports a `lead` prop and a `showLiveDot` prop — we just need to compose them.
- **Cycling area** (right in RTL = "next"): a single `RateItem` displayed with its source list title as eyebrow. Auto-cycles every 4s. Hover pauses.
- **Manual controls** (right edge): prev/next chevrons + pause/play (reuse the same `CompactRateBridge` pattern, simplified).
- **Marquee strip below** (a thin secondary row): a `Marquee` of all active rate-list titles (e.g. "سارای شاهزاده · نرخ تهران · صرافی ملی · ..."), in tiny font — gives context that there are multiple lists.
- **Accent color**: per source list. Sara-ye Shahzadeh → emerald, Nerkh Tehran → cyan, generic → primary blue. Reuse `getCategoryAccent`-style map in the new file.

### 2. MainNav "بازار" mega-menu

Add a new top-level item "بازار" with a small emerald pulsing dot. On click/hover (desktop) or tap (mobile) it opens a `motion.div` panel (Linear-style fade-down, reusing `dropdownPanel` from `src/lib/motion.ts`) that contains a 3-column grid of rate items from all active `RateList`s, sourced from the same `getRateLists()` call already in `(site)/layout.tsx`.

This is the "menu surprise": a live mega-menu that surfaces market data, with:
- Category-grouped columns (forex / gold / crypto).
- Each item shows buy/sell with color-coded pills.
- "بیشتر" link at the bottom of each column goes to `/money-transfer`.
- Subtle aurora background on the panel.

## Verification

After implementation:

1. Run `npm run lint` — zero warnings, zero errors.
2. Run `npm run build` — zero TypeScript errors.
3. Manually verify in `npm run dev`:
   - Home page → scroll to "آخرین مقالات" → see the new thin strip at the top rotating between rate items every 4s.
   - Hover the strip → it pauses.
   - Click the prev/next chevrons → manual control works.
   - Open the "بازار" mega-menu in the nav → see the same data presented as a grid.
   - Verify RTL: all `start`/`end` are used (no `left`/`right`).
   - Verify dark mode: aurora background and glassmorphism look right in both modes.
   - Verify reduced-motion: cycle animation falls back to instant swap.
   - Lighthouse: no new client components beyond what's already there (the new strip is `'use client'` but is mounted inside the existing `LatestArticles` which is already client, so no new client boundary).
   - Mobile (360px): strip collapses to a single-line height, prev/next hidden behind a tap-to-rotate gesture.
4. Grep checks:
   - `parseRateItem` — single source of truth in `src/lib/rateItem.ts`.
   - `old name / import path` — zero results.

## Critical files to be modified or created

- **Created:** `src/components/Sections/PulseBoard/RateListsTicker.tsx` (new, ~250 lines).
- **Created:** `src/lib/rateItem.ts` (helper, ~30 lines, replaces 2 inline duplicates).
- **Modified:** `src/components/Sections/PulseBoard/PulseSection.tsx` (1 block — add `getRateLists` to `Promise.all`, pass prop).
- **Modified:** `src/components/Sections/PulseBoard/LatestArticles.tsx` (add 1 prop, render new strip in 1 new block).
- **Modified:** `src/components/Sections/PulseBoard/index.ts` (export `RateListsTicker` if needed for re-use from nav).
- **Modified:** `src/app/(site)/layout.tsx` (add `getRateLists` fetch, pass to `MainNav`).
- **Modified:** `src/components/Navigation/MainNav.tsx` (add "بازار" mega-menu item + panel).
- **Refactored:** `src/app/(site)/money-transfer/RateListGrid.tsx` (use `parseRateItem` helper, lines 178-184).
- **Refactored:** `src/app/(site)/(home)/designs/CompactRateBridge.tsx` (use `parseRateItem` helper, lines 48-69, 99-101, 147-152).

No new dependencies. No new env vars. No new Prisma models. No new API routes.

## What does NOT change

- The `MarketTicker` (crypto+DB live polling) stays as is — it complements, doesn't replace, the new rotating strip.
- The `CompactRateBridge` in `Design7` (slider bridge) stays — it serves a different role (one buy/sell pill on the active post of the slider).
- The `MarketRatesTickerBar` (free-market rates in `Design7` top) stays.
- The `Header` `HeaderAdBar` and `MainNav` structure stays — only the nav gets a new "بازار" mega-menu item.
- All other sections of the home page (SectionMagazine7, AdCardStrip, TopAuthors, Newsletter) are untouched.
- Backend schema, Prisma, auth, env — all untouched.

## Risk analysis

- **Cache freshness:** `getRateLists()` is cached 300s. If admin updates a list it takes up to 5 minutes to show. Acceptable — matches existing behavior.
- **Rate item density:** 60+ items × cycling could be visually noisy. Mitigation: only the *active* item is shown in the cycling panel; the rest of the items appear in a thin marquee strip below as context, with subtle opacity.
- **Empty state:** If `getRateLists()` returns `[]` (e.g. fresh DB), the strip collapses to `null` (no render). The existing `MarketTicker` handles the empty crypto case the same way.
- **RTL bug surface:** All new code uses `start`/`end` (Tailwind `ps-`/`pe-`). `parseRateItem` is direction-neutral. Tested in both `dir="rtl"` and `dir="ltr"`.
- **Mega-menu accessibility:** Uses `role="menu"` + `role="menuitem"` + ArrowDown focus trap. Pause/play buttons reuse `aria-label`. Manual controls get `aria-label="نرخ قبلی/بعدی"`.
- **Performance:** `RateListsTicker` is `'use client'` but mounted inside the existing `LatestArticles` (already client) — no new client boundary. Total additional JS: ~2 KiB (one component file, no new lib). Bundle stays under the 200 KB gzip budget.
- **No build required for small changes** per user instruction: I'll fix any TypeScript / lint errors that surface, but won't trigger a full `next build` unless the user asks. The user said "for small jobs no need to build, just fix errors" — I'll interpret "small" as not triggering a production build, but I'll still run `npm run lint` and `npx tsc --noEmit` to catch type errors.

## Confirmed direction (user-approved)

- **Menu surprise:** live "بازار" mega-menu inside MainNav (Linear-style drawer with the same rate data).
- **Rate sources:** DB `RateList` rows only (sara-ye shahzadeh, nerkh tehrān, etc.). Reuse `getRateLists()` as-is.
- **Rotation style:** single hero item with cycling (4s auto, prev/next chevrons, pause on hover). Reuse the `CompactRateBridge` pattern from `Design7.tsx` but flatter and wider.

The new strip and the mega-menu both pull from the same `getRateLists()` server fetch in `(site)/layout.tsx`, so there is exactly one source of truth on the server.
