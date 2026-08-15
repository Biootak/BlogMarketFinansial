import { AD_STRIP_SIZES } from '@/lib/image-sizes';
import { devImageSrc } from '@/lib/image-url';
import type { Advertisement } from '@/types/types';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type Props = {
  ad: Advertisement;
};

/**
 * ArchiveAdCard — ad display tuned for the archive page (2026).
 *
 * Design constraints:
 *  - The full image must be visible (no cropping).
 *  - The card must be exactly the image's size (no wasted space).
 *  - The card must stay compact — a typical ad banner is 16:6 / 16:5, not
 *    16:9, so we cap the height and pick a wide default aspect ratio.
 *  - Large uploads must NOT be served at full resolution to the client.
 *
 * Technique (2026 best-practice):
 *  - `next/image` so the image's natural aspect ratio defines the card
 *    (no fixed aspect ratio, no cropping).
 *  - `width`/`height` come from `customDimensions` (captured at upload by
 *    the sharp pipeline) so Next emits a proper `srcset`/`sizes` and
 *    prevents CLS. Fallback to 800×300 (16:6 — a typical ad banner) for
 *    legacy ads without stored dimensions.
 *  - The upload route generates pre-sized WebP variants (400/800/1200/1920
 *    w). Browsers pick the smallest variant that fits the viewport via
 *    `sizes` — a 400px-wide ad on mobile downloads a ~30KB WebP instead of
 *    a multi-MB 4K original.
 *  - `loading="lazy"` + `decoding="async"` for below-the-fold strips.
 *  - A blurred backdrop sits behind the image so the card never looks
 *    empty during load and there is no visible background bleed if the
 *    image has transparent edges.
 *  - `max-height` on the wrapper keeps the card compact even when the
 *    stored dimensions happen to be near-square.
 */
export default function ArchiveAdCard({ ad }: Props) {
  const dims = parseDims(ad.customDimensions);
  // Fallback to a typical ad banner aspect ratio (16:6 = 800×300) when
  // dimensions are missing — prevents CLS and keeps the card compact.
  const width = dims?.width ?? 800;
  const height = dims?.height ?? 300;

  return (
    <Link
      href={ad.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={`تبلیغ: ${ad.title}`}
      className="group/ad atl-archive-ad block w-full overflow-hidden rounded-xl border border-neutral-200/70 bg-neutral-50 transition-all duration-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <div className="atl-archive-ad__media">
        {/* Blurred backdrop — keeps the frame filled during load and hides
            any transparent edges of the foreground image. Low quality is
            fine here since it's only seen as a soft fill. */}
        <Image
          aria-hidden
          src={devImageSrc(ad.imageUrl)}
          alt=""
          width={width}
          height={height}
          sizes={AD_STRIP_SIZES}
          quality={40}
          loading="lazy"
          decoding="async"
          className="atl-archive-ad__backdrop"
        />
        {/* Foreground — natural size, fully visible. */}
        <Image
          src={devImageSrc(ad.imageUrl)}
          alt={ad.title}
          width={width}
          height={height}
          sizes={AD_STRIP_SIZES}
          loading="lazy"
          decoding="async"
          className="atl-archive-ad__img"
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-neutral-200/70 px-3 py-2 text-[10.5px] sm:text-[11px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          <span className="line-clamp-1">{ad.title}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          <span>تبلیغ</span>
          <ExternalLink className="h-3 w-3" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

type Dim = { width: number; height: number };

function parseDims(json: unknown): Dim | null {
  if (!json || typeof json !== 'object') return null;
  const w = (json as Record<string, unknown>).width;
  const h = (json as Record<string, unknown>).height;
  const toNum = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v);
    if (typeof v === 'string') {
      const n = Number.parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };
  const nw = toNum(w);
  const nh = toNum(h);
  if (!nw || !nh) return null;
  return { width: nw, height: nh };
}
