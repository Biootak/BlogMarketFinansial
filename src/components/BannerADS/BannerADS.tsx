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
        return 'w-full lg:w-64';
      case 'CUSTOM':
      default:
        return '';
    }
  };

  const getImageContainerStyle = () => {
    if (customDimensions) {
      return {
        width: customDimensions.width || '100%',
        height: customDimensions.height,
        aspectRatio: customDimensions.aspectRatio,
      };
    }
    switch (size) {
      case 'LARGE':
        return { width: '100%', height: '250px', aspectRatio: '300/250' };
      case 'MEDIUM':
        return { width: '100%', height: '100px', aspectRatio: '300/100' };
      case 'SMALL':
        return { width: '100%', height: '50px', aspectRatio: '300/50' };
      default:
        return {};
    }
  };

  const getImageContainerClass = () => {
    if (customDimensions) return '';
    return cn('relative w-full', {
      'aspect-[300/250]': size === 'LARGE',
      'aspect-[300/100]': size === 'MEDIUM',
      'aspect-[300/50]': size === 'SMALL',
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

  const getImageSize = () => {
    switch (size) {
      case 'LARGE':
        return 'w-full h-[250px]';
      case 'MEDIUM':
        return 'w-full h-[100px]';
      case 'SMALL':
        return 'w-full h-[50px]';
      case 'CUSTOM':
        return customDimensions?.width || 'w-full h-[100px]';
      default:
        return 'w-full h-[100px]';
    }
  };

  if (imageOnly) {
    return (
      <Link
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('block', getPositionClass(position), className)}
      >
        <div className={getImageContainerClass()} style={getImageContainerStyle()}>
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
        'nc-BannerADS relative flex flex-col sm:flex-row items-start sm:items-center p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow',
        getContentSize(),
        getPositionClass(position),
        className,
      )}
      style={customDimensions ? { width: customDimensions.width } : {}}
    >
      <Link
        href={linkUrl}
        className="absolute inset-0 z-0"
        target="_blank"
        rel="noopener noreferrer"
      />
      <Link
        href={linkUrl}
        className={cn(
          'block relative flex-shrink-0 rounded-2xl overflow-hidden z-10',
          getImageSize(),
        )}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
        />
      </Link>
      <div className="flex flex-col flex-grow w-full">
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
