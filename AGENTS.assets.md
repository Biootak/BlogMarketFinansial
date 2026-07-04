# Assets — Static Image / Font / SVG Conventions

> Anything served directly from `public/` (or imported into the bundle).
> Read this before adding a logo, icon, hero image, placeholder, or SVG.

## TL;DR (3 rules)

1. **Put the file in `public/` and reference it as a URL**. Never `import`
   images from a JS/TS module — that breaks Webpack/Turbopack when the
   import target moves, doubles as a hidden `404`, and stops
   `next/image` from serving the optimized variant.
2. **Always use `<Image>` from `next/image`** for raster, and inline
   `<svg>` for icons. Never use a raw `<img>` for a static asset the
   site owns — you give up automatic WebP/AVIF, lazy loading, and srcset.
3. **Re-run `npm run assets:optimize` before committing**. It's fast,
   idempotent, and writes the `.webp` sibling `next/image` will pick
   first.

## The forbidden pattern

The previous template imported from a `src/images/` folder via the
`@/images` alias:

```ts
// ❌ BAD — the folder does not exist in this repo, build breaks.
import logo from '@/images/logo.png';
```

It was a legacy of the upstream Next.js boilerplate and was removed.
Three files used to do this — `ButtonPlayMusicPlayer.tsx`,
`single-audio/.../page.tsx`, and `about/page.tsx`. They were rewritten
on **2026-07-04** to use public URLs.

## Where assets live

```
public/
├── favicon.ico
├── default-avatar.png           ← fallback avatar (SearchModal, etc.)
└── images/
    ├── logo.png                 ← 3.2 KB (rarely used — see Logo.tsx)
    ├── logo-light.png           ← 3.2 KB (light theme variant)
    ├── about-hero-right.png     ← About-page hero, see note ↓
    ├── about-hero-right.webp    ← preferred by `next/image`
    ├── icon-playing.gif         ← audio "playing" state (2.6 KB)
    ├── placeholder-small.png    ← 6.6 KB, used everywhere as fallback
    ├── placeholder-large.png    ← 13 KB
    ├── placeholder-large-h.png  ← 15 KB (horizontal cover variant)
    ├── paypal.svg               ← 2.5 KB
    ├── mastercard.svg           ← 1.4 KB
    ├── visa.svg                 ← 22 KB (bank-logo, dense paths)
    ├── banktransfer.svg         ← 14 KB
    ├── currency-exchange.svg    ← 18 KB
    ├── online-payment-hero.svg  ← 34 KB (payment-page illustration)
    └── crypto/                  ← 36 currency SVGs (aave.svg, btc.svg, …)
```

The `Logo` component itself uses **inline SVG** (`src/components/Logo/LogoSvg.tsx`)
and reads its color from `currentColor`. No raster file is required for
the default theme. The `logoUrl` prop on `<Logo />` is only consulted
when an admin has uploaded a custom logo via `SystemSettings.logoUrl`,
in which case `next/image` is used.

## Conventions

### Vector logos / marks
- **Inline SVG component** for the site logo and any mark that must
  respond to theme. Use `currentColor` for strokes.
- File-level SVG for one-off illustrations (`online-payment-hero.svg`,
  payment-method logos). Keep them in `public/images/`.

### Icons (UI)
- Prefer **Lucide React** (`lucide-react`) — already tree-shaken via
  `optimizePackageImports` in `next.config.ts`.
- For payment-method or brand logos, use the SVG file. Never raster.

### Hero / cover images
- Commit a **PNG/JPG ≤ 1920 px on the long edge**, plus its sibling
  `.webp`. `scripts/optimize-assets.mjs` does this in one command.
- Reference with `<Image src="/images/foo.png" alt="…" width={…}
  height={…} />` so the optimizer can serve `image/avif` or `image/webp`
  based on Accept header.

### Placeholders / fallbacks
- Single source of truth in `public/images/placeholder-{small,large,
  large-h}.png`. Used by PostCard variants, Editor1 image resize,
  GallerySlider, ExchangeRate cards, and the dashboard ad calendar.
- These are intentionally small (≤ 15 KB) and never changed at runtime.

### Fonts
- Vazirmatn is **self-hosted** under `public/fonts/vazirmatn/`,
  Arabic + Latin + Persian subsets. Loaded via `next/font/local` in
  `src/app/layout.tsx` — no FOIT, no Google request.
- If you add another font, **subset it** (Glyphhanger or
  `fonttools subset`); a full Vazirmatn without Persian is ~250 KB.

## Adding a new asset — checklist

1. `git add public/images/<name>.<ext>`.
2. Run `npm run assets:optimize` (writes the `.webp` sibling).
3. Import it as a URL: `const hero = '/images/<name>.png';`
4. Render with `<Image>`:

   ```tsx
   <Image
     src={hero}
     alt="…"
     width={1920}
     height={1080}
     priority={isAboveFold}
     sizes="(max-width: 768px) 100vw, 50vw"
   />
   ```

5. If it is a **demo-only asset** used in an unused route, delete the
   route along with the asset. Orphan files hide here for years and cost
   bundle size forever.

## `scripts/optimize-assets.mjs`

Hand-rolled, zero new dep. Run it before any commit that touches
`public/images/`. Stats printed inline:

```
  FILE                                            BEFORE        AFTER         SAVINGS
  ──────────────────────────────────────────────────────────────────────────────────
  public\images\about-hero-right.png                 1.26 MB    294.5 KB   77%
  public\images\default-avatar.png                  134.9 KB     43.9 KB   67%
  public\images\crypto\crypto.png                   118.9 KB     20.8 KB   82%  ← removed (orphan)
  public\images\podcast.jpg                         104.0 KB     50.0 KB   52%
  …
```

Idempotent — re-running with no source change is a no-op (use
`--force` to force re-encode, e.g. after pulling a larger replacement).

### Why not just trust `next/image`?

`next/image`'s optimizer generates the same WebP/AVIF on-demand at the
CDN. For assets that load on every page (`default-avatar.png`,
`placeholder-*.png`, payment-hero), generating them once-and-for-all at
commit-time means the CDN serves a static file with **no per-visitor
transform cost** and the bytes are visible in the repo / PR review.

For ad-hoc user-uploaded media (the `uploads/` tree, served via
`/api/uploads/:path*`), `next/image` is still the right tool because
the source is unbounded in size and shape.

## Anti-patterns to avoid

| ❌ Don't | ✅ Do |
|---|---|
| `import logo from '@/images/…'` | `const logo = '/images/…'` |
| `<img src="/images/hero.png" />` | `<Image src={hero} width={…} height={…} />` |
| raster payment-mark PNG | the existing SVG in `public/images/` |
| full Vazirmatn font | subset (Arabic + Persian only) |
| rebuild `src/images/` folder | put it in `public/images/` and use URL |
| orphan files left in `public/` | delete (trash) on sight |
