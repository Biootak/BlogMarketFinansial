/**
 * BannerADS — بازطراحی ۲۰۲۶ (نسخه refined)
 * ----------------------------------------------------------------------------
 * چهار variant:
 *  - spotlight  → هیرو editorial با aurora halo، mask reveal، tilt on hover
 *  - rich       → کارت اسپلیت با تصویر + متن + CTA shimmer
 *  - image      → تصویر-محور با حاشیه conic-gradient چرخان روی hover
 *  - minimal    → سایدبار فشرده با AD eyebrow
 *
 *  Server Component. تمام motion ها CSS-only هستن. Backward-compat shim
 *  برای prop های قدیمی (imageOnly, showAdLabel, ...) حفظ شده.
 */

import Link from 'next/link';
import { ArrowUpLeft, ExternalLink, Sparkles } from 'lucide-react';
import SafeImage from '@/components/SafeImage/SafeImage';
import { cn, parseCustomDimensions } from '@/lib/utils';
import type { Advertisement, AdSize, AdPosition, CustomAdDimensions } from '@/types/types';

export type BannerAdVariant = 'rich' | 'image' | 'spotlight' | 'minimal';

export interface BannerAdsProps {
  className?: string;
  ad: Advertisement;
  customDimensions?: CustomAdDimensions;
  /** default: 'image' */
  variant?: BannerAdVariant;
  /** Legacy shim: if true → variant="image" */
  imageOnly?: boolean;
  /** Legacy shim: show the hairline "تبلیغ" pill (default true on rich/spotlight) */
  showAdLabel?: boolean;
  /** Legacy shim: render title (used by rich) */
  showTitle?: boolean;
  /** Legacy shim: render description (used by rich) */
  showDescription?: boolean;
  /** Legacy shim: render CTA (used by rich) */
  showButton?: boolean;
  /** Legacy shim: override CTA node */
  customButton?: React.ReactNode;
}

/* ------------------------------------------------------------------------- */
/*  Helpers                                                                 */
/* ------------------------------------------------------------------------- */

function getRatioForSize(
  size: AdSize,
  custom?: CustomAdDimensions,
): { ratio: string; variant: 'card' | 'hero' | 'thumbnail' } {
  if (size === 'CUSTOM' && custom?.aspectRatio) {
    return { ratio: custom.aspectRatio, variant: 'card' };
  }
  switch (size) {
    case 'LARGE':
      return { ratio: '16/5', variant: 'hero' };
    case 'MEDIUM':
      return { ratio: '16/6', variant: 'card' };
    case 'SMALL':
      return { ratio: '16/7', variant: 'thumbnail' };
    default:
      return { ratio: '16/6', variant: 'card' };
  }
}

function resolveVariant(
  explicit: BannerAdVariant | undefined,
  legacy: {
    imageOnly?: boolean;
    showAdLabel?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
    showButton?: boolean;
  },
): BannerAdVariant {
  if (explicit) return explicit;
  if (legacy.imageOnly) return 'image';
  // Derive from legacy booleans for callers still on the old API
  if (legacy.showTitle || legacy.showDescription || legacy.showButton) return 'rich';
  return 'image';
}

/* ------------------------------------------------------------------------- */
/*  Private sub-components                                                  */
/* ------------------------------------------------------------------------- */

function BannerAdLabel({ text = 'تبلیغ', className }: { text?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-[10px] font-bold uppercase tracking-[0.18em]',
        'text-primary-500 dark:text-primary-300',
        'bg-primary-500/10 dark:bg-primary-400/10',
        'border border-primary-500/20 dark:border-primary-400/20',
        'backdrop-blur-sm',
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
      <span>{text}</span>
    </span>
  );
}

function BannerCta({
  href,
  label = 'مشاهده',
  size = 'md',
}: {
  href: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg'
      ? 'px-5 py-2.5 text-sm'
      : size === 'sm'
        ? 'px-3 py-1.5 text-[11px]'
        : 'px-4 py-2 text-xs sm:text-sm';
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={cn(
        'ad-cta-shimmer inline-flex items-center gap-1.5 rounded-full',
        'font-semibold tracking-snug',
        'bg-neutral-900 text-white',
        'dark:bg-white dark:text-neutral-900',
        'shadow-sm hover:shadow-md transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
        sizeClass,
      )}
    >
      <span>{label}</span>
      <ArrowUpLeft className="h-3.5 w-3.5 rtl:rotate-0" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}

/* ------------------------------------------------------------------------- */
/*  Main component                                                          */
/* ------------------------------------------------------------------------- */

export default function BannerAds({
  className = '',
  ad,
  customDimensions,
  variant: variantProp,
  imageOnly,
  showAdLabel,
  showTitle,
  showDescription,
  showButton,
  customButton,
}: BannerAdsProps) {
  const { title, description, imageUrl, linkUrl, size, position } = ad;
  const parsedCustom = customDimensions ?? parseCustomDimensions(ad.customDimensions);
  const { ratio, variant: imageVariant } = getRatioForSize(size, parsedCustom ?? undefined);

  // Backward-compat resolution
  const variant = resolveVariant(
    variantProp,
    { imageOnly, showAdLabel, showTitle, showDescription, showButton },
  );

  // Show the label by default on rich + spotlight, hide on image + minimal
  const showLabelResolved =
    typeof showAdLabel === 'boolean'
      ? showAdLabel
      : variant === 'rich' || variant === 'spotlight' || variant === 'minimal';
  const showTitleResolved =
    typeof showTitle === 'boolean' ? showTitle : variant === 'rich' || variant === 'spotlight';
  const showDescriptionResolved =
    typeof showDescription === 'boolean' ? showDescription : variant === 'rich';
  const showButtonResolved =
    typeof showButton === 'boolean' ? showButton : variant === 'rich' || variant === 'spotlight';

  const isLcp = size === 'LARGE' || variant === 'spotlight';

  /* ------------------------------------------------------------------- */
  /*  Image-only (the `image` + `minimal` variants)                      */
  /* ------------------------------------------------------------------- */
  if (variant === 'image' || variant === 'minimal') {
    const isMinimal = variant === 'minimal';
    return (
      <Link
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`تبلیغ: ${title}`}
        className={cn(
          'nc-BannerADS group/ad relative block w-full anim-fade-in-up',
          isMinimal
            ? 'rounded-2xl overflow-hidden bg-surface-elevated/30 transition-transform duration-300 hover:scale-[1.02]'
            : 'ad-conic-border rounded-3xl overflow-hidden bg-surface-elevated/40 transition-transform duration-300 hover:-translate-y-0.5',
          getPositionClass(position),
          className,
        )}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden',
            isMinimal ? 'aspect-[16/9] sm:aspect-[16/8]' : 'aspect-[16/5] sm:aspect-[16/6]',
          )}
        >
          <SafeImage
            src={imageUrl}
            alt={title}
            variant={imageVariant}
            ratio={ratio}
            sizes={isMinimal ? '(max-width: 1024px) 100vw, 320px' : '100vw'}
            priority={isLcp}
            fill
            className="object-cover"
          />
        </div>

        {/* Top-end corner label (always shown for minimal; hover for image) */}
        {showLabelResolved && (
          <div
            className={cn(
              'absolute z-10',
              isMinimal
                ? 'end-2 top-2 opacity-100'
                : 'end-3 top-3 opacity-0 translate-y-1 group-hover/ad:opacity-100 group-hover/ad:translate-y-0 transition-all duration-300',
            )}
          >
            <BannerAdLabel text={isMinimal ? 'AD' : 'تبلیغ'} />
          </div>
        )}

        {/* Bottom-start "مشاهده" pill (image variant only, on hover) */}
        {!isMinimal && (
          <div
            className={cn(
              'absolute z-10 start-4 bottom-4',
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
              'bg-white/95 text-neutral-900 backdrop-blur-md',
              'dark:bg-neutral-900/95 dark:text-white',
              'text-[11px] sm:text-xs font-semibold',
              'border border-[color:var(--hairline)]',
              'shadow-sm',
              'opacity-0 translate-y-2 group-hover/ad:opacity-100 group-hover/ad:translate-y-0',
              'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            )}
          >
            <span>مشاهده</span>
            <ExternalLink className="h-3 w-3" strokeWidth={2.25} aria-hidden />
          </div>
        )}
      </Link>
    );
  }

  /* ------------------------------------------------------------------- */
  /*  Spotlight — full-bleed editorial hero                              */
  /* ------------------------------------------------------------------- */
  if (variant === 'spotlight') {
    return (
      <Link
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`تبلیغ: ${title}`}
        className={cn(
          'nc-BannerADS group/ad relative block w-full overflow-hidden anim-fade-in-up ad-tilt-hover',
          'rounded-3xl border border-[color:var(--hairline)]',
          'bg-gradient-to-br from-surface-elevated/80 via-surface-elevated/40 to-surface-elevated/80',
          'dark:from-surface-elevated/70 dark:via-surface-elevated/40 dark:to-surface-elevated/70',
          'backdrop-blur-xl',
          'p-6 sm:p-8 md:p-10',
          'shadow-[0_2px_24px_-12px_rgba(0,0,0,0.18)]',
          'transition-shadow duration-300 hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.28)]',
          getPositionClass(position),
          className,
        )}
      >
        {/* Aurora halo — soft radial gradients that drift */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60% 50% at 20% 0%, var(--aurora-a) 0%, transparent 60%), radial-gradient(60% 50% at 90% 100%, var(--aurora-b) 0%, transparent 60%)',
          }}
        />

        {showLabelResolved && (
          <div className="absolute start-4 top-4 sm:start-6 sm:top-6 z-20">
            <BannerAdLabel />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-6 md:gap-10 items-center">
          {/* Image — with scroll-driven mask reveal */}
          <div className="order-1 md:order-none">
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-2xl',
                'ring-1 ring-[color:var(--hairline)]',
                'aspect-[16/9] md:aspect-[16/10]',
              )}
            >
              <div className="absolute inset-0 ad-mask-reveal">
                <SafeImage
                  src={imageUrl}
                  alt={title}
                  variant="hero"
                  ratio="16/10"
                  sizes="(max-width: 768px) 100vw, 60vw"
                  priority={isLcp}
                  fill
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/ad:scale-[1.02]"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
            {showTitleResolved && (
              <h2 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight leading-tight text-neutral-900 dark:text-white line-clamp-2 text-balance">
                {title}
              </h2>
            )}
            {showDescriptionResolved && description && (
              <p className="text-sm sm:text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2 sm:line-clamp-3">
                {description}
              </p>
            )}
            {showButtonResolved && (
              <div className="mt-1 sm:mt-2">
                {customButton ?? <BannerCta href={linkUrl} label="مشاهده پیشنهاد" size="lg" />}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  /* ------------------------------------------------------------------- */
  /*  Rich — split image + text card                                     */
  /* ------------------------------------------------------------------- */
  return (
    <div
      className={cn(
        'nc-BannerADS relative w-full anim-fade-in-up',
        'rounded-3xl overflow-hidden',
        'border border-[color:var(--hairline)]',
        'bg-white/[0.04] dark:bg-white/[0.06]',
        'backdrop-blur-xl',
        'shadow-[0_2px_24px_-12px_rgba(0,0,0,0.18)]',
        'transition-shadow duration-300 hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.24)]',
        getPositionClass(position),
        className,
      )}
    >
      {/* Whole-card click layer */}
      <Link
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`تبلیغ: ${title}`}
        className="absolute inset-0 z-0"
      />

      {/* Vertical accent strip (RTL start edge) */}
      <div
        aria-hidden
        className="absolute inset-y-0 start-0 w-1 sm:w-1.5"
        style={{
          background:
            'linear-gradient(180deg, var(--aurora-a), var(--primary-500) 50%, var(--aurora-b))',
        }}
      />

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 sm:gap-6 md:gap-8 items-center p-5 sm:p-6 md:p-7">
        {/* Image */}
        <div className="relative w-full sm:w-64 md:w-72 lg:w-80 aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-[color:var(--hairline)]">
          <SafeImage
            src={imageUrl}
            alt={title}
            variant="card"
            ratio="16/10"
            sizes="(max-width: 640px) 100vw, 320px"
            fill
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04]"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 sm:gap-3 min-w-0">
          {showLabelResolved && (
            <div className="flex">
              <BannerAdLabel />
            </div>
          )}
          {showTitleResolved && (
            <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight text-neutral-900 dark:text-white line-clamp-2 text-balance">
              {title}
            </h2>
          )}
          {showDescriptionResolved && description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
          {showButtonResolved && (
            <div className="mt-1 sm:mt-2">
              {customButton ?? <BannerCta href={linkUrl} size="md" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPositionClass(position: AdPosition): string {
  switch (position) {
    case 'HEADER':
    case 'FOOTER':
    case 'IN_CONTENT':
    case 'BETWEEN_POSTS':
    case 'SIDEBAR':
    case 'CUSTOM':
    default:
      return 'w-full';
  }
}
