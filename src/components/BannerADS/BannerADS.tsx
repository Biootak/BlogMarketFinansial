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

  return (
    <div
      dir="rtl"
      className={`nc-BannerADS relative flex flex-col sm:flex-row items-start sm:items-center p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow ${className}`}
    >
      <Link
        href={linkUrl}
        className="absolute inset-0 z-0"
        target="_blank"
        rel="noopener noreferrer"
      />
      <Link
        href={linkUrl}
        className="block relative flex-shrink-0 w-full h-48 mb-4 sm:w-56 sm:h-40 sm:mb-0 sm:ml-5 rounded-2xl overflow-hidden z-10"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 224px, 224px"
        />
      </Link>
      <div className="flex flex-col flex-grow w-full">
        <div className="space-y-3 mb-4">
          {showAdLabel && (
            <span className="inline-block px-2 py-1 rounded-full font-medium text-xs relative text-pink-800 bg-pink-100 dark:text-pink-100 dark:bg-pink-800">
              تبلیغات
            </span>
          )}
          {showTitle && (
            <h2 className="block font-semibold text-base sm:text-md">
              <Link
                href={linkUrl}
                className="line-clamp-2"
                title={title}
                target="_blank"
                rel="noopener noreferrer"
              >
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
    </div>
  );
};

export default BannerADS;
