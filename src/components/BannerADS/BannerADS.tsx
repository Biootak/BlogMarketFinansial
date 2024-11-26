import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Advertisement, AdSize, CustomAdDimensions, AdPosition } from '@/types/types';

export interface BannerAdsProps {
  className?: string;
  ad: Advertisement;
  customDimensions?: CustomAdDimensions;
  showAdLabel?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showButton?: boolean;
  customButton?: React.ReactNode;
  imageOnly?: boolean;
}

export default function BannerAds({
  className = '',
  ad,
  customDimensions,
  showAdLabel = false,
  showTitle = false,
  showDescription = false,
  showButton = false,
  customButton,
  imageOnly = false,
}: BannerAdsProps) {
  const { title, description, imageUrl, linkUrl, size, position } = ad;

  const getPositionClass = (position: AdPosition) => {
    switch (position) {
      case 'HEADER':
      case 'FOOTER':
      case 'IN_CONTENT':
      case 'BETWEEN_POSTS':
        return 'w-full';
      case 'SIDEBAR':
        return 'w-full';
      case 'CUSTOM':
      default:
        return '';
    }
  };

  const getImageContainerClass = () => {
    if (size === 'CUSTOM') return '';
    return cn('relative w-full overflow-hidden', {
      'aspect-[16/5]': size === 'LARGE',
      'aspect-[16/6]': size === 'MEDIUM',
      'aspect-[16/7]': size === 'SMALL',
    });
  };

  const getContentSize = () => {
    switch (size) {
      case 'LARGE':
        return 'sm:p-6 md:p-8';
      case 'MEDIUM':
        return 'sm:p-5 md:p-6';
      case 'SMALL':
        return 'sm:p-4';
      case 'CUSTOM':
        return customDimensions?.width ? 'p-4' : 'sm:p-5 md:p-6';
      default:
        return 'sm:p-5 md:p-6';
    }
  };

  if (imageOnly) {
    return (
      <Link
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('block w-full', getPositionClass(position), className)}
      >
        <div
          className={cn(
            'relative w-full h-full overflow-hidden rounded-lg',
            getImageContainerClass(),
          )}
        >
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-fill w-full h-full "
            sizes="100vw"
            priority
          />
        </div>
      </Link>
    );
  }

  return (
    <div
      dir="rtl"
      className={cn(
        'nc-BannerADS relative flex flex-col items-start p-4 rounded-3xl',
        'sm:flex-row sm:items-center',
        getContentSize(),
        getPositionClass(position),
        className,
      )}
    >
      <Link
        href={linkUrl}
        className="absolute inset-0 z-0"
        target="_blank"
        rel="noopener noreferrer"
      />
      <div
        className={cn('relative flex-shrink-0 rounded-2xl overflow-hidden z-10 w-full', {
          'h-48 sm:h-48': size === 'LARGE',
          'h-40 sm:h-40': size === 'MEDIUM',
          'h-32 sm:h-32': size === 'SMALL',
          [`h-${customDimensions?.height}`]: size === 'CUSTOM',
        })}
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-fill w-full h-full  "
          sizes="100vw"
        />
      </div>
      <div className="flex flex-col flex-grow w-full sm:mr-4 mt-4 sm:mt-0">
        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
          {showAdLabel && (
            <span className="inline-block px-2 py-1 rounded-full font-medium text-xs relative text-pink-800 bg-pink-100 dark:text-pink-100 dark:bg-pink-800">
              تبلیغات
            </span>
          )}
          {showTitle && (
            <h2
              className={cn('block font-semibold line-clamp-2', {
                'text-lg sm:text-xl': size === 'LARGE',
                'text-base sm:text-lg': size === 'MEDIUM' || size === 'CUSTOM',
                'text-sm sm:text-base': size === 'SMALL',
              })}
            >
              <Link href={linkUrl} title={title} target="_blank" rel="noopener noreferrer">
                {title}
              </Link>
            </h2>
          )}
          {showDescription && (
            <p
              className={cn('text-neutral-500 dark:text-neutral-400 line-clamp-2', {
                'text-sm sm:text-base': size === 'LARGE',
                'text-xs sm:text-sm': size === 'MEDIUM' || size === 'SMALL' || size === 'CUSTOM',
              })}
            >
              {description || ''}
            </p>
          )}
        </div>
        {showButton && (
          <div className="flex items-center flex-wrap justify-between mt-auto">
            {customButton || (
              <Link
                href={linkUrl}
                className={cn(
                  'relative nc-Button flex items-center justify-center rounded-full transition-colors font-medium ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50',
                  {
                    'text-sm px-4 py-2 sm:px-5 sm:py-2.5': size === 'LARGE',
                    'text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2':
                      size === 'MEDIUM' || size === 'CUSTOM',
                    'text-xs px-3 py-1 sm:px-3 sm:py-1.5': size === 'SMALL',
                  },
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                مشاهده تبلیغ
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
