'use client';

/**
 * HeaderAdBarClient — narrow ad bar at the very top of the header.
 *
 *  - Server-rendered: <HeaderAdBar> (server) only renders this component
 *    when there is an active ad. The first paint always matches the
 *    server-rendered HTML, which is the requirement for hydration to
 *    succeed.
 *  - Dismissal: the user pressing × sets a localStorage flag and the
 *    client then unmounts. Because the server never knew about the
 *    dismissal, we use a `useState(true)` (initially visible) and a
 *    `useEffect` that may immediately set it to false if the user
 *    previously dismissed this ad. To avoid hydration mismatch we
 *    keep the initial render identical to the server output, then
 *    reconcile after mount.
 *  - Dismissal TTL: 1 hour. After that, the ad will show again so
 *    the same user still sees a returning-promo slot on a fresh visit.
 *
 * 2026-06-14: hydration-safe version — initial visible state matches
 * server; only after mount do we consult localStorage. Dismissal
 * window shortened from 24h to 1h on user request.
 */

import { Megaphone, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type Theme = 'PRIMARY' | 'ACCENT' | 'NEUTRAL' | 'DARK' | 'GRADIENT';
type Variant = 'TEXT' | 'IMAGE' | 'MIXED';

interface Ad {
  id: string;
  text: string;
  subtext?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  variant: Variant;
  theme: Theme;
}

const STORAGE_PREFIX = 'header-ad-dismissed:';

const themeClasses: Record<Theme, string> = {
  PRIMARY:
    'bg-primary-50/95 dark:bg-primary-950/90 text-primary-900 dark:text-primary-100 border-primary-200/60 dark:border-primary-800/50',
  ACCENT:
    'bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100 border-amber-200/60 dark:border-amber-800/50',
  NEUTRAL:
    'bg-neutral-100/95 dark:bg-neutral-800/95 text-neutral-900 dark:text-neutral-100 border-neutral-200/60 dark:border-neutral-700/50',
  DARK: 'bg-neutral-900/95 text-white border-neutral-700/60',
  GRADIENT:
    'bg-gradient-to-l from-primary-600 via-indigo-600 to-purple-600 text-white border-transparent',
};

const ctaClasses: Record<Theme, string> = {
  PRIMARY: 'bg-primary-600 hover:bg-primary-700 text-white',
  ACCENT: 'bg-amber-600 hover:bg-amber-700 text-white',
  NEUTRAL:
    'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900',
  DARK: 'bg-white hover:bg-neutral-100 text-neutral-900',
  GRADIENT: 'bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20',
};

export default function HeaderAdBarClient({ ad }: { ad: Ad }) {
  // 2026-06-14: start `true` to match the server render. The server has
  // already determined the ad is active and rendered this component;
  // we must not return null on first client paint or React will
  // complain about a hydration mismatch.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`${STORAGE_PREFIX}${ad.id}`);
      if (dismissed) {
        const ts = Number.parseInt(dismissed, 10);
        if (Number.isFinite(ts) && Date.now() - ts < 60 * 60 * 1000) {
          setVisible(false);
        }
      }
    } catch {
      // localStorage unavailable — keep the bar visible
    }
  }, [ad.id]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${ad.id}`, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  const Wrapper = ad.href ? 'a' : 'div';
  const wrapperProps = ad.href
    ? { href: ad.href, target: '_blank', rel: 'noopener noreferrer sponsored' }
    : {};

  return (
    <div
      role="region"
      aria-label="تبلیغ"
      data-theme={ad.theme}
      data-variant={ad.variant}
      className={`
        relative w-full
        border-b backdrop-blur-md
        ${themeClasses[ad.theme]}
        animate-in slide-in-from-top-2 duration-300
      `}
      style={{ animation: 'headerAdSlideIn 280ms ease-out' }}
    >
      <div className="container">
        <div
          className="
            flex items-center justify-center gap-2 sm:gap-3
            h-8 sm:h-9
            text-xs sm:text-[13px]
          "
        >
          {ad.variant !== 'TEXT' && ad.imageUrl ? (
            <span className="relative flex-shrink-0 size-5 sm:size-6 rounded-md overflow-hidden bg-black/10">
              <Image
                unoptimized
                fill
                sizes="24px"
                src={ad.imageUrl}
                alt={ad.text ? `تصویر تبلیغ: ${ad.text}` : 'تصویر تبلیغ'}
                className="object-contain"
                loading="lazy"
              />
            </span>
          ) : ad.variant !== 'TEXT' ? (
            <Megaphone className="flex-shrink-0 size-3.5 sm:size-4 opacity-70" aria-hidden />
          ) : (
            <Sparkles
              className="hidden sm:inline-block flex-shrink-0 size-3.5 opacity-70"
              aria-hidden
            />
          )}

          <Wrapper
            {...wrapperProps}
            className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0 truncate"
          >
            <span className="font-medium truncate">{ad.text}</span>
            {ad.subtext && (
              <span className="hidden md:inline opacity-70 truncate">— {ad.subtext}</span>
            )}
          </Wrapper>

          {ad.ctaLabel && ad.ctaHref && (
            <a
              href={ad.ctaHref}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`
                hidden sm:inline-flex
                flex-shrink-0
                items-center gap-1
                h-6 px-2.5
                text-[11px] font-semibold
                rounded-md
                transition-colors duration-200
                ${ctaClasses[ad.theme]}
              `}
            >
              {ad.ctaLabel}
            </a>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="بستن تبلیغ"
            className="
              flex-shrink-0
              size-6 sm:size-7
              flex items-center justify-center
              rounded-md
              opacity-60 hover:opacity-100
              hover:bg-black/5 dark:hover:bg-white/10
              transition-all duration-200
            "
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
