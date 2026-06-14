'use client';

/**
 * HeaderAdBarClient — تبلیغ باریک بالای هدر
 *
 *  - پیش‌فرض h-8 (32px) هم‌ارتفاع با TickerBar
 *  - در صورت وجود href کل بنر لینک می‌شود
 *  - دکمه × تبلیغ را برای session با localStorage می‌بندد
 *  - theme ها: primary | accent | neutral | dark | gradient
 *  - variant ها: text | image | mixed
 *
 *  ۲۰۲۶-۰۶-۱۴: glassmorphism ملایم + animation slide-down
 */

import { useEffect, useState } from 'react';
import { X, Sparkles, Megaphone } from 'lucide-react';

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
  DARK:
    'bg-neutral-900/95 text-white border-neutral-700/60',
  GRADIENT:
    'bg-gradient-to-l from-primary-600 via-indigo-600 to-purple-600 text-white border-transparent',
};

const ctaClasses: Record<Theme, string> = {
  PRIMARY:
    'bg-primary-600 hover:bg-primary-700 text-white',
  ACCENT:
    'bg-amber-600 hover:bg-amber-700 text-white',
  NEUTRAL:
    'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900',
  DARK:
    'bg-white hover:bg-neutral-100 text-neutral-900',
  GRADIENT:
    'bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20',
};

export default function HeaderAdBarClient({ ad }: { ad: Ad }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`${STORAGE_PREFIX}${ad.id}`);
      if (dismissed) {
        const ts = Number.parseInt(dismissed, 10);
        // expire بعد از ۲۴ ساعت
        if (Number.isFinite(ts) && Date.now() - ts < 24 * 60 * 60 * 1000) {
          setVisible(false);
          return;
        }
      }
    } catch {
      // localStorage در دسترس نیست (private mode) → پیش‌فرض visible
    }
    setVisible(true);
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
          {/* Optional Icon */}
          {ad.variant !== 'TEXT' && ad.imageUrl ? (
            <span className="flex-shrink-0 size-5 sm:size-6 rounded-md overflow-hidden bg-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.imageUrl}
                alt=""
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </span>
          ) : ad.variant !== 'TEXT' ? (
            <Megaphone
              className="flex-shrink-0 size-3.5 sm:size-4 opacity-70"
              aria-hidden
            />
          ) : (
            <Sparkles
              className="hidden sm:inline-block flex-shrink-0 size-3.5 opacity-70"
              aria-hidden
            />
          )}

          {/* Banner content */}
          <Wrapper
            {...wrapperProps}
            className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0 truncate"
          >
            <span className="font-medium truncate">{ad.text}</span>
            {ad.subtext && (
              <span className="hidden md:inline opacity-70 truncate">— {ad.subtext}</span>
            )}
          </Wrapper>

          {/* CTA button */}
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

          {/* Close button */}
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
