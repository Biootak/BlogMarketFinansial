/**
 * image-url.ts — dev-only URL normalizer for next/image sources.
 *
 * WHY IT EXISTS
 * ------------
 * On this dev machine the ISP/network resolves some image CDNs
 * (`images.unsplash.com`, `images.pexels.com`, `picsum.photos`) to a fake
 * private IP and the hosts are unreachable. Next's optimizer then returns
 * HTTP 400/404, and every page rendering those images logs a console error.
 *
 * The fix lives at the COMPONENT level (SafeImage + direct <Image> usages),
 * NOT via `next.config images.loaderFile`: a custom loaderFile means "use my
 * own optimization service" — Next then stops serving the `/_next/image`
 * route in dev, which 404s every optimized image. Keeping the default loader
 * and mapping the blocked hosts to a local placeholder in code fixes only the
 * unreachable sources and leaves the optimizer intact for everything else.
 *
 * Production is untouched — all blocked-host checks are `NODE_ENV ===
 * 'development'` only, so deployed environments keep the real remote URLs.
 */

const BLOCKED_DEV_HOSTS = ['images.unsplash.com', 'images.pexels.com', 'picsum.photos'];

export const DEV_IMAGE_FALLBACK = '/images/image-fallback.svg';

/**
 * In development only, map sources from unreachable CDNs to the local
 * placeholder so the browser never requests a blocked host. Returns the input
 * unchanged in production and for all other hosts in dev.
 */
export function devImageUrl(src: string | null | undefined): string | null | undefined {
  if (!src) return src;
  if (process.env.NODE_ENV !== 'development') return src;
  return BLOCKED_DEV_HOSTS.some((host) => src.includes(host)) ? DEV_IMAGE_FALLBACK : src;
}

/**
 * Same as `devImageUrl` but with a non-nullable result for direct assignment
 * into `src` props that already have a fallback (`src || '/fallback.png'`).
 */
export function devImageSrc(src: string | null | StaticImageData | undefined): string | StaticImageData {
  if (typeof src !== 'string') return src ?? '';
  return devImageUrl(src) ?? src;
}

type StaticImageData = { src: string; height: number; width: number; blurDataURL?: string };

