'use client';

import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';
/**
 * SafeImage
 * ----------------------------------------------------------------------------
 * یه wrapper استاندارد برای نمایش تصویر که:
 *  - وقتی src خالی/null هست، یه placeholder گرادینت ملایم با آیکون نشون می‌ده
 *  - وقتی تصویر خطا می‌ده (404، CORS، و...) همون placeholder رو نشون می‌ده
 *  - با `next/image` ادغام می‌شه (lazy loading، responsive sizes، priority)
 *  - RTL-safe (dir از parent ارث می‌بره)
 *  - با prefers-reduced-motion سازگاره (هیچ انیمیشن اضافی نداره)
 *
 * استفاده:
 *   <SafeImage src={post.featuredImage} alt={post.title} ratio="16/9" />
 *   <SafeImage src={user.avatar} alt={user.name} variant="avatar" />
 */
import Image, { type ImageProps } from 'next/image';
import { type CSSProperties, useEffect, useState } from 'react';

type ImageVariant = 'card' | 'avatar' | 'hero' | 'thumbnail';

export interface SafeImageProps extends Omit<ImageProps, 'src' | 'alt' | 'onError'> {
  /** URL تصویر. اگه خالی/null باشه، placeholder نشون داده می‌شه. */
  src?: string | null;
  /** متن جایگزین — برای screen reader و SEO الزامیه */
  alt: string;
  /** Aspect ratio. پیش‌فرض `16/9`. */
  ratio?: string;
  /** ظاهر: card (مستطیل)، avatar (دایره)، hero (بزرگ)، thumbnail (کوچک) */
  variant?: ImageVariant;
  /** کلاس برای container خارجی */
  containerClassName?: string;
  /** آیکون دلخواه برای placeholder. پیش‌فرض ImageOff. */
  placeholderIcon?: React.ReactNode;
  /** متن کوچک زیر آیکون (مثلاً "بدون تصویر"). */
  placeholderLabel?: string;
  /**
   * نحوه‌ی پر کردن کادر:
   *  - `cover`   → object-cover (پیش‌فرض رفتار قبلی؛ پر می‌کند ولی برش می‌زند)
   *  - `ambient` → تکنیک ۲۰۲۶: تصویرِ کامل با object-contain روی یک پس‌زمینه‌ی
   *                محو و هم‌رنگ از همان تصویر. هم کل کادر پر می‌شود و هم تصویر
   *                کامل و بدون برش دیده می‌شود (مثل YouTube / Apple TV).
   */
  fillMode?: 'cover' | 'ambient';
}

const RATIO_BY_VARIANT: Record<ImageVariant, string> = {
  card: '16/9',
  avatar: '1/1',
  hero: '21/9',
  thumbnail: '4/3',
};

const VARIANT_OVERLAY: Record<ImageVariant, string> = {
  card: 'rounded-2xl',
  avatar: 'rounded-full',
  hero: 'rounded-3xl',
  thumbnail: 'rounded-xl',
};

const ICON_SIZE_BY_VARIANT: Record<ImageVariant, string> = {
  card: 'w-10 h-10 sm:w-12 sm:h-12',
  avatar: 'w-8 h-8',
  hero: 'w-14 h-14 sm:w-16 sm:h-16',
  thumbnail: 'w-6 h-6',
};

export default function SafeImage({
  src,
  alt,
  ratio,
  variant = 'card',
  containerClassName = '',
  className = 'object-cover',
  sizes = '(max-width: 600px) 480px, 800px',
  priority = false,
  fill = true,
  placeholderIcon,
  placeholderLabel,
  fillMode = 'cover',
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  // وقتی src تغییر می‌کنه، error state رو reset کن
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — reset on src change only
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isEmpty = !src || (typeof src === 'string' && src.trim() === '');
  const showPlaceholder = isEmpty || hasError;

  // اگه container absolute/inset باشه، aspect-ratio اعمال نمی‌کنیم
  const hasAbsolutePosition =
    containerClassName.includes('absolute') || containerClassName.includes('inset-');

  // ratio override
  const effectiveRatio = ratio ?? RATIO_BY_VARIANT[variant];

  // placeholder style
  const placeholderStyle: CSSProperties = {
    background:
      'linear-gradient(135deg, rgb(247 248 250) 0%, rgb(240 242 246) 50%, rgb(224 228 235) 100%)',
  };

  return (
    <div
      className={cn('relative overflow-hidden', VARIANT_OVERLAY[variant], containerClassName)}
      style={hasAbsolutePosition ? undefined : { aspectRatio: effectiveRatio, ...placeholderStyle }}
    >
      {showPlaceholder ? (
        // Placeholder: گرادینت ملایم + آیکون (بدون متن تا محتوای دیگه رو تحت‌الشعاع نذاره)
        <div
          className="absolute inset-0 flex items-center justify-center text-neutral-400 dark:text-neutral-500"
          aria-label={alt}
          role="img"
        >
          <div className="flex flex-col items-center gap-1.5 opacity-70">
            {placeholderIcon ?? (
              <ImageOff
                className={cn(ICON_SIZE_BY_VARIANT[variant])}
                strokeWidth={1.5}
                aria-hidden
              />
            )}
            {placeholderLabel && (
              <span className="text-[10px] sm:text-xs font-medium">{placeholderLabel}</span>
            )}
          </div>
        </div>
      ) : fillMode === 'ambient' ? (
        // Ambient blurred backdrop (2026): تصویرِ کامل روی پس‌زمینه‌ی محوِ هم‌رنگ.
        <>
          <Image
            aria-hidden
            className="object-cover scale-110 blur-2xl brightness-[0.85] saturate-150"
            alt=""
            sizes={sizes}
            priority={priority}
            fill
            src={src as string}
            {...props}
          />
          <Image
            className={cn('object-contain', className === 'object-cover' ? undefined : className)}
            alt={alt}
            sizes={sizes}
            priority={priority}
            fill={fill}
            src={src as string}
            onError={() => setHasError(true)}
            {...props}
          />
        </>
      ) : (
        <Image
          className={className}
          alt={alt}
          sizes={sizes}
          priority={priority}
          fill={fill}
          src={src as string}
          onError={() => setHasError(true)}
          {...props}
        />
      )}
    </div>
  );
}
