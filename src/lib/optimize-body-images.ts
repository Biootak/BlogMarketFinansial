import 'server-only';

/**
 * @file optimize-body-images.ts — server-side body-<img> optimizer.
 *
 * Article bodies are SSR'd to static HTML and injected via
 * `dangerouslySetInnerHTML`, so next/image's component can't wrap them.
 * This transform rewrites raw `<img src="…">` into `<img srcset="…" src="…">`
 * pointing at Next's built-in image optimizer (`/_next/image`), which serves
 * AVIF/WebP and resizes to the exact viewport widths. Result: article images
 * get responsive, format-optimized delivery with zero client-side JS.
 *
 * Only remote / absolute image hosts in the `images.remotePatterns` allowlist
 * are rewritten; local `/…` paths and data: URIs pass through untouched
 * (they're already next/image-optimized or inline).
 */

// Widths emitted per image — matches the `imageSizes` device breakpoints so
// the browser picks the closest cache entry. 480 covers mobile, 768 tablet,
// 1200 desktop card/body width, 1920 full-bleed retina.
const OPTIMIZED_WIDTHS = [480, 768, 1200, 1920];
const DEFAULT_WIDTH = 1200;

/** Hosts served by the Next image optimizer (must match next.config images). */
const OPTIMIZABLE_HOSTS = new Set([
  'images.pexels.com',
  'images.unsplash.com',
  'biotak.storage.c2.liara.space',
  'cdn.jsdelivr.net',
]);

const srcsetPattern = /^\s*[\d\s,wx/]+(?:\s*\d+w)?\s*$/;

/**
 * Encode a URL for use as the `url` query param of `/_next/image`.
 */
function encodeImageUrl(url: string): string {
  return encodeURIComponent(url);
}

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
  const maxW = widths[widths.length - 1];

  const srcset = widths
    .map((w) => `/_next/image?url=${encodeImageUrl(url)}&w=${w}&q=75 ${w}w`)
    .join(', ');

  // sizes: article body is ~60vw of a max-w-3xl container. Use vw-based sizes
  // so the browser picks the right candidate before layout.
  const sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 640px';

  // fetchpriority=high only for the very first in-body image (rough LCP proxy);
  // everything else stays lazy. Rewrite loading=lazy only if not already set.
  let out = tag.replace(
    /(<img[^>]*\bsrc="[^"]+")/i,
    `$1 srcset="${srcset}" sizes="${sizes}"`,
  );

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

export { OPTIMIZABLE_HOSTS };
