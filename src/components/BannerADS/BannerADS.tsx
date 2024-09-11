import type React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Advertisement, AdSize } from '@/types/types';

export interface BannerADSProps {
  className?: string;
  ad: Advertisement;
  size?: AdSize;
  showAdLabel?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showButton?: boolean;
  customButton?: React.ReactNode;
  imageOnly?: boolean;
}

const BannerADS: React.FC<BannerADSProps> = ({
  className = '',
  ad,
  size = 'MEDIUM',
  showAdLabel = true,
  showTitle = true,
  showDescription = true,
  showButton = true,
  customButton,
  imageOnly = false,
}) => {
  const { title, description, imageUrl, linkUrl } = ad;

  if (imageOnly) {
    return (
      <Link
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full ${className}`}
      >
        <div className="relative w-full aspect-[21/9] sm:aspect-[21/6] md:aspect-[21/5] lg:aspect-[21/4]">
          <Image src={imageUrl} alt={title} fill className="object-cover" sizes="100vw" />
        </div>
      </Link>
    );
  }

  const sizeClasses = {
    SMALL: 'h-20 sm:h-24',
    MEDIUM: 'h-32 sm:h-40',
    LARGE: 'h-48 sm:h-64',
  };

  const titleClasses = {
    SMALL: 'text-xs',
    MEDIUM: 'text-sm sm:text-base',
    LARGE: 'text-base sm:text-lg',
  };

  return (
    <div
      className={`nc-BannerADS relative flex group flex-row-reverse items-center sm:p-4 sm:rounded-3xl sm:bg-white sm:dark:bg-neutral-900 sm:border border-neutral-200 dark:border-neutral-700 ${sizeClasses[size]} ${className}`}
    >
      <Link
        href={linkUrl}
        className="absolute inset-0 z-0"
        target="_blank"
        rel="noopener noreferrer"
      />
      <div className="flex flex-col flex-grow">
        <div className="space-y-2 mb-2">
          {showAdLabel && (
            <span className="inline-block px-2 py-1 rounded-full font-medium text-xs relative text-pink-800 bg-pink-100 dark:text-pink-100 dark:bg-pink-800">
              تبلیغات
            </span>
          )}
          {showTitle && (
            <h2 className={`block font-semibold ${titleClasses[size]}`}>
              <Link href={linkUrl} className="line-clamp-2" title={title}>
                {title}
              </Link>
            </h2>
          )}
          {showDescription && (
            <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm line-clamp-2">
              {description || ''}
            </p>
          )}
        </div>
        {showButton && (
          <div className="flex items-center flex-wrap justify-between mt-auto">
            {customButton || (
              <Link
                href={linkUrl}
                className="relative nc-Button flex items-center justify-center rounded-full transition-colors text-xs sm:text-sm font-medium px-3 py-1 sm:px-4 sm:py-1.5 ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50"
                target="_blank"
                rel="noopener noreferrer"
              >
                مشاهده تبلیغ
              </Link>
            )}
          </div>
        )}
      </div>

      <Link
        href={linkUrl}
        className={`block relative flex-shrink-0 ${
          size === 'SMALL'
            ? 'w-20 h-20'
            : size === 'MEDIUM'
              ? 'w-24 h-24 sm:w-40 sm:h-40'
              : 'w-32 h-32 sm:w-56 sm:h-56'
        } me-3 sm:me-5 rounded-2xl overflow-hidden z-0 `}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 80px, (max-width: 768px) 160px, 240px"
        />
      </Link>
    </div>
  );
};

export default BannerADS;
