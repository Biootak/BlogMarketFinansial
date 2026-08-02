# Performance Optimization Plan — Financial Market (2026)

## Root cause (top bottleneck)

**`src/app/(site)/layout.tsx` line 14: `export const dynamic = 'force-dynamic'`**

The whole public tree is server-rendered **on every request**. Reason stated in the comment: `MainNav` (rendered by `SiteHeaderData`) calls `auth()` to render sign-in/avatar state → any ancestor using request-dependent API opts the subtree out of static generation.

Consequences:
- Home page + every article render at request time (DB queries + auth + rate fetches per request).
- No `generateStaticParams` / ISR anywhere (`grep generateStaticParams` → 0 in `src/app/(site)`).
- The only defense is the CDN `s-maxage=300` header — which caches a **dynamic** page and is invalidated every 5 min regardless of content change.
- TTFB is DB-bound on the request path.

### Solution — make the public site static/ISR, keep auth client-side

1. **Remove `force-dynamic`** from `(site)/layout.tsx`. `SiteHeaderData`, `SiteFooterData`, `SiteSettingsData`, `MobileBottomNavGate`, `QuickActionsGate` are already wrapped in `<Suspense>` — none need request data. Static shell renders at build, data boundaries stream/fill client-side.
2. **Decouple `MainNav` from `auth()`** (single-file, contained):
   - `MainNav` stays a server component but stops awaiting `auth()`. Its sign-in/avatar area becomes a small client island `<AuthStatus />` that reads `useSession()` (auto-fetch, `SessionProvider` already mounted in root layout) — same UX, zero `auth()` on the render path.
   - Result: `(site)` tree becomes static-safe. Page routes can now opt into `revalidate`.
3. **Per-route ISR** (pages that render posts/rates):
   - Home `(home)/page.tsx`: `export const revalidate = 300` (5 min) — rates are safeCache'd at 60–300s anyway; sections stream.
   - Single post pages `single/[[...slug]]/page.tsx` (+ audio/video/gallery variants): `generateStaticParams` for published post slugs + `revalidate = 300`. Article bodies are already static HTML (recent work), so a static render is correct.
   - Archive `archive/[[...slug]]/page.tsx`: keep dynamic (query/filter/category combo space too large to prerender) — already streams.
   - `search`: stays dynamic (depends on `q`).
   - `exchanges/*`, `services`, `track`: already have `revalidate` — unchanged.
   - `credit-rates` `force-dynamic`: keep (live rates) or narrow.
4. **Hero `auth()` removal**: `HeroSection` awaits `auth().catch(() => null)` for CTA personalization. Remove it; pass guest default to `HeroVisual`. Cuts an auth() call + its `request` opt-in per home render. (With a static parent it's already inert, but removing avoids re-adding the perf tax later.)
5. **Prisma route handlers**: verify `/api/pageview` and `/api/public/*` use `noStore`/connection pool + batch; they run outside the static tree.

### Expected gains
- Home/single TTFB: from DB-on-every-request → static HTML from cache (CDN edge or Next internal). LCP improves (no waiting on `getPostBySlug` + `auth()` to start streaming).
- Content staleness handled by ISR revalidation (5 min) + `revalidatePath`/`safeRevalidateTag` on mutation (already wired via cacheActions).
- No behavior change: signed-in users still see avatar via `useSession` auto-fetch; header still streams via Suspense.

---

## Phase 2 — React/client rendering (INP, bundle) — audit completed

- **`SingleContentClient`** scroll handler: reads `offsetTop/offsetHeight` + `innerText` write + `setState` per rAF frame → re-renders whole article client tree. Fix: drop scroll listener entirely — use existing `IntersectionObserver` on end anchor + `window.scrollY + innerHeight >= scrollHeight` (no layout read). Update progress % via CSS var (`style.setProperty`), never `innerText`.
- **`ExchangeQuotesBoard` (`/money-transfer`)**: 1 `setInterval(1s)` per quote row → N concurrent intervals, 1s render cadence across table. Fix: single interval in parent, pass `now` down, rows derive `now - expiresAt`; memo `QuoteTableRow`.
- **`SearchModal`**: `body` scroll-lock reads `document.documentElement.clientWidth` (forced reflow on open). Fix: CSS `scrollbar-gutter` + overflow hidden only.
- **`ScrollReveal`**: `setTimeout` without cleanup — store id, clear on unmount.
- **`MenuBar`**: stale-closure `useCallback` — fix deps.
- Verified clean: `PageViewTracker` (beacon+idle), tickers (rAF/CSS), providers, HeroVisual tilt — no action.
- **`PageViewTracker`**: keep mounted once, no render work.
- Header `Navigation2026` client comp; verify `BazarMegaPanel` lazy.
- Ensure zero public-page imports of tiptap/editor runtime (done server-side).

## Phase 4 — Bundle

- **`61104…js` 0.3MB = recharts** (client, dashboard/customer). Verify it's not on public pages.
- **`1984…js` 0.4MB = lowlight+highlight+prosemirror** (server render-content) — verify not in client bundle.
- **`d3ac…js` = katex** — verify server-only (math extension).
- Move `playwright`, `fast-check` to `devDependencies` (currently in `dependencies`).
- Check `xlsx`, `lodash` (wholesale import?), `react-icons` (already in optimizePackageImports).
- After static conversion, re-run `next build` + measure.

## Validation
- `npm run build` (webpack) clean.
- Bundle analysis on `.next/static/chunks`.
- Lighthouse (perf/a11y/best-practices/SEO) + CWV (LCP/INP/CLS/TBT).
- Iterate until bottlenecks negligible.

## Status — 2026-08-02 pass

**Done (this session + prior uncommitted work):**
- ✅ `(site)` layout de-forced-dynamic — auth() removed from server tree (MainNav/Hero/Gates → client `useSession` island). Public routes now static/ISR.
- ✅ Home ISR (`revalidate=300`), singles SSG (`generateStaticParams` + `revalidate`), verified in route table (`○ /`, `● /single/...`).
- ✅ Article body moved to server render (`EditorContentHTML` + server `MarkdownRenderer`); TipTap/markdown pipeline (~800KB) removed from client bundle.
- ✅ Body images → `optimizeBodyImages` (server): rewrites `<img>` to `/_next/image` AVIF/WebP srcset. Applied in `EditorContentHTML`.
- ✅ LCP covers: `PostFeaturedMedia` gained `priority` prop; `single-3`/`single-video`/`single-audio` pass it (cover no longer `loading=lazy`).
- ✅ `SingleContentClient` scroll progress: dropped rAF+layout-read+`innerText`+setState per frame → ResizeObserver-measured height + guarded `textContent` + threshold-guarded state. No re-render on scroll.
- ✅ `ExchangeQuotesBoard`: N×1s per-row countdown intervals → single board-wide interval, rows derive label from shared `now`; interval pauses when nothing live.
- ✅ `ScrollReveal` setTimeout now cleared on unmount.
- ✅ **dnd-kit lazy split**: `MobileBottomNavSortable` (46KB) loaded via `next/dynamic` on long-press; `@dnd-kit/*` no longer in the 927KB shared chunk (→860KB). Biggest removable public-bundle win.
- ✅ `npm run build` switched `next build --webpack` → `next build` (Turbopack). Webpack build crashes silently on this machine (EPERM/EBUSY on `.next`); Turbopack build succeeds in ~50s and handles oklch/color-mix. Kept `build:webpack` for fallback.
- ✅ `storage.ts` `path.join(process.cwd()...)` scoped with `turbopackIgnore` to stop whole-project NFT trace.

**Measured (production build):**
- Home critical JS ~446KB (rootMainFiles) + 860KB next-auth/headlessui shared chunk = ~1.3MB raw (~250KB gzipped). next-auth is the dominant irreducible cost (functional auth in header).
- Home CSS ~1.1MB raw (~150KB gzipped) across 11 chunks; largest is 760KB design-system chunk. Minified by lightningcss (PERF_PLAN P5 stale claim resolved).
- dnd-kit isolated to 46KB async chunk — saved ~80KB uncompressed off every public page.

**Still open / lower priority:**
- `playwright`, `fast-check` → move to `devDependencies` (zero source imports).
- Raw `<img>` in exchanges/about/services (small logos) — low value, next/image overhead not worth it.
- `react-player` stays lazy (only on card hover) — fine.
- bonbast/tgju `cache:'no-store'` fetches — only fire when DB has no active rate lists (currently 3 exist); safeCache TTL protects. Not a prod path today.

## Phase 4 — Bundle

- Move `playwright`, `fast-check` to `devDependencies` (currently in `dependencies`).
- Check `xlsx`, `lodash` (wholesale import?), `react-icons` (already in optimizePackageImports).
- Largest shared chunks identified; after static conversion, re-run `next build` + measure.

## Validation
- `npm run build` (Turbopack) clean + TypeScript clean (`tsc --noEmit` → 0 errors).
- Bundle analysis on `perf-out/static/chunks` (isolated dist dir; `.next` is dev-server-locked).
- Lighthouse (perf/a11y/best-practices/SEO) + CWV (LCP/INP/CLS/TBT) — run against a deployment with DB env (standalone prod server needs DB creds to avoid the bonbast fallback 500).
- Iterate until bottlenecks negligible.
