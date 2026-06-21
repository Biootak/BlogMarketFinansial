/**
 * image-sizes — responsive image variants (2026 best-practice)
 * --------------------------------------------------------------------------
 * Why this exists:
 *   - A user may upload a 4K/8K photo, but the card displaying it is 400px
 *     wide. Without variants, the browser downloads the full 4K file and
 *     scales it down with CSS — wasteful on bandwidth and battery.
 *   - With variants, we generate a small set of pre-sized WebP files once
 *     at upload time. The browser picks the smallest one that fits via
 *     `srcset`/`sizes`. Zero CPU on the runtime, full CDN-cacheable.
 *
 * Naming convention:
 *   <original>.webp                  — full size (≤1920w, from upload route)
 *   <original>-400.webp              — 400w
 *   <original>-800.webp              — 800w
 *   <original>-1200.webp             — 1200w
 *   <original>-1920.webp             — 1920w (same as original, kept for symmetry)
 *
 * Storage cost: ~4 extra files per upload, each ~50–250KB WebP.
 * Runtime cost: zero (static files, served by S3/CDN).
 * --------------------------------------------------------------------------
 */

export const IMAGE_WIDTHS = [400, 800, 1200, 1920] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/** Default `sizes` for a full-width post card. */
export const DEFAULT_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, (max-width: 1280px) 50vw, 33vw';

/** Sizes for in-feed ad strips (2 per row on desktop, 1 on mobile). */
export const AD_STRIP_SIZES = '(max-width: 768px) 100vw, 50vw';

/**
 * Returns the URL of a specific width variant.
 * If the URL has no file extension (e.g. a dynamic endpoint) or is a
 * data URL, returns the URL unchanged.
 */
export function variantUrl(url: string, width: ImageWidth, ext = 'webp'): string {
  if (!url || url.startsWith('data:')) return url;
  const lastDot = url.lastIndexOf('.');
  const lastSlash = url.lastIndexOf('/');
  if (lastDot === -1 || lastDot < lastSlash) return url;
  return `${url.slice(0, lastDot)}-${width}.${ext}`;
}

/**
 * Builds a `srcset` string for the standard width ladder.
 * Use as: <img src={url} srcset={buildSrcSet(url)} sizes={...} />
 */
export function buildSrcSet(
  url: string,
  widths: readonly ImageWidth[] = IMAGE_WIDTHS,
): string {
  if (!url) return '';
  return widths.map((w) => `${variantUrl(url, w)} ${w}w`).join(', ');
}

/**
 * Aspect-ratio aware variant (for ads/cards where the original aspect ratio
 * matters). The URL stays the same — only the `widths` change. Kept as a
 * separate export for readability at call sites.
 */
export function responsiveUrl(url: string): { src: string; srcSet: string } {
  return { src: url, srcSet: buildSrcSet(url) };
}
