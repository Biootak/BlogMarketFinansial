/**
 * image-sizes — `sizes` attribute constants for next/image
 * ------------------------------------------------------------------
 * Why this file exists:
 *   - The `sizes` attribute on `<Image>` (and the equivalent prop on
 *     next/image) tells the browser which viewport slot the rendered
 *     image will fill, so it can pick the right entry from `srcset`.
 *   - Centralizing the strings here prevents every consumer from
 *     re-deriving its own breakpoints — they drift, the image
 *     optimizer picks the wrong rendition, and CLS creeps back in.
 *
 * Why no `IMAGE_WIDTHS` / variant helpers:
 *   - As of 2026-07-06 the upload route returns a single canonical
 *     WebP per file. Responsive sizing is delegated entirely to
 *     next/image's runtime optimizer (it produces its own AVIF/WebP
 *     renditions on demand against the single source). Generating
 *     server-side variants up-front was removed because:
 *       (a) it was ~5x the CPU and I/O per upload,
 *       (b) it produced files that were never referenced because
 *           no caller used `variantUrl` / `buildSrcSet`.
 * ------------------------------------------------------------------
 */

/** Sizes for in-feed ad strips (2 per row on desktop, 1 on mobile). */
export const AD_STRIP_SIZES = '(max-width: 768px) 100vw, 50vw';
