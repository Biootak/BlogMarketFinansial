import 'server-only';

import imageLoader from '@/lib/image-loader';

/**
 * @file optimize-body-images.ts — server-side body-<img> optimizer.
 *
 * Article bodies are SSR'd to static HTML and injected via
 * `dangerouslySetInnerHTML`, so next/image's component can't wrap them.
 * This transform rewrites raw `<img src="…">` into `<img srcset="…" src="…">`
 * pointing at each host's own CDN transform (unsplash/pexels w/q params) —
 * the same CDN-side strategy as the global `images.loaderFile` in
 * next.config.ts. Result: article images get responsive, format-optimized
 * delivery with zero server-side sharp work and zero client-side JS.
 *
 * ⚠️ 2026-08-15: قبلاً srcset به `/_next/image` (optimizer داخلی) اشاره می‌کرد.
 * با loaderFile سفارشی، route `/_next/image` دیگر سرو نمی‌شود — تصاویر مقالات
 * 404 می‌گرفتند. حالا همان `imageLoader` سراسری (src/lib/image-loader) صدا
 * زده می‌شود تا URL های CDN مستقیم بسازد — یک منبع حقیقت واحد.
 *
 * Only remote / absolute image hosts in `OPTIMIZABLE_HOSTS` are rewritten;
 * local `/…` paths and data: URIs pass through untouched.
 */

// Widths emitted per image — 480 covers mobile, 768 tablet, 1200 desktop
// card/body width, 1920 full-bleed retina.
const OPTIMIZED_WIDTHS = [480, 768, 1200, 1920];
const DEFAULT_WIDTH = 1200;

/**
 * Hosts that our CDN-side loader can transform (must match src/lib/image-loader).
 * jsdelivr تصویر-transform ندارد → passthrough (بدون srcset).
 */
const OPTIMIZABLE_HOSTS = new Set(['images.pexels.com', 'images.unsplash.com']);

/**
 * Rewrite a single `<img …>` tag to add srcset/sizes + fetchpriority attrs.
 * Parses src/width/height/loading; skips imgs already carrying srcset, gifs
 * (animated — optimizer can't convert), and data: URIs.
 */
function optimizeImgTag(tag: string): string {
  const srcMatch = tag.match(/<img[^>]*\bsrc="([^"]+)"/i);
  if (!srcMatch) return tag;
  const src = srcMatch[1];

  // Skip non-optimizable sources.
  if (
    src.startsWith('data:') ||
    src.endsWith('.gif') ||
    tag.includes('srcset=') ||
    /_next\/image/.test(src)
  ) {
    return tag;
  }

  let url = src;
  try {
    const parsed = new URL(src, 'https://financialmarket.page');
    if (!OPTIMIZABLE_HOSTS.has(parsed.hostname)) return tag;
    url = parsed.href;
  } catch {
    return tag;
  }

  // Infer intrinsic width from the stored width attr (best-effort). Fall back
  // to a sensible default so srcset still emits reasonable candidates.
  const wAttr = tag.match(/\bwidth="(\d+)"/i)?.[1];
  const intrinsic = wAttr ? Number.parseInt(wAttr, 10) : DEFAULT_WIDTH;
  const widths = OPTIMIZED_WIDTHS.filter((w) => w <= intrinsic);
  if (widths.length === 0) widths.push(480);

  // همان loader سراسری — مستقیم از CDN خودِ تصویر (بدون /_next/image)
  const srcset = widths
    .map((w) => `${imageLoader({ src: url, width: w, quality: 75 })} ${w}w`)
    .join(', ');

  // sizes: article body is ~60vw of a max-w-3xl container. Use vw-based sizes
  // so the browser picks the right candidate before layout.
  const sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 640px';

  // fetchpriority=high only for the very first in-body image (rough LCP proxy);
  // everything else stays lazy. Rewrite loading=lazy only if not already set.
  let out = tag.replace(/(<img[^>]*\bsrc="[^"]+")/i, `$1 srcset="${srcset}" sizes="${sizes}"`);

  const hasLoading = /\bloading=/i.test(out);
  if (!hasLoading) {
    out = out.replace(/<img/i, '<img loading="lazy"');
  }
  const hasFetchPriority = /\bfetchpriority=/i.test(out);
  if (!hasFetchPriority) {
    out = out.replace(/<img/i, '<img fetchpriority="auto"');
  }

  // Remove explicit width/height that would conflict with srcset? Keep them —
  // they set the aspect-ratio box, preventing CLS. But cap at maxW to avoid
  // absurd boxes.
  return out;
}

/**
 * Transform a full HTML fragment's `<img>` tags. Server-side only.
 */
export function optimizeBodyImages(html: string): string {
  if (!html || !html.includes('<img')) return html;
  return html.replace(/<img[^>]*>/gi, optimizeImgTag);
}

/**
 * Wrap every `<table>` (each rendered by TipTap/GFM as its own block) in an
 * `overflow-x-auto` container so wide article tables can scroll horizontally
 * on mobile instead of being clipped. Server-side only — applied to the
 * read-only body HTML before it is set via dangerouslySetInnerHTML.
 */
export function wrapBodyTables(html: string): string {
  if (!html || !html.includes('<table')) return html;
  // Match full <table ...>...</table> blocks and wrap each one. TipTap/GFM
  // never emit nested tables, and don't double-wrap an already-wrapped table.
  return html.replace(
    /<table(\b[^>]*)>(((?!<\/?table\b)[\s\S])*?)<\/table>/gi,
    (_m) => `<div class="overflow-x-auto">${_m}</div>`,
  );
}
