import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  aspectRatio?: string; // e.g., "16/9", "4/3", "1/1"
  sizes?: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Optimized Image Component
 * - Automatic format selection (AVIF → WebP → JPEG)
 * - Responsive srcset generation
 * - Lazy loading with blur placeholder
 * - Aspect ratio preservation to prevent CLS
 */
export function OptimizedImage({
  src,
  alt,
  aspectRatio = '16/9',
  sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  className,
  fill = false,
  width,
  height,
  quality = 80,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Calculate width and height from aspect ratio if not provided
  let calculatedWidth = width;
  let calculatedHeight = height;

  if (!fill && (!width || !height) && aspectRatio) {
    const [w, h] = aspectRatio.split('/').map(Number);
    if (w && h) {
      // Use a base width of 1200px for calculation
      calculatedWidth = width || 1200;
      calculatedHeight = height || Math.round((calculatedWidth * h) / w);
    }
  }

  // Handle image load error
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Handle image load complete
  const handleLoad = () => {
    setIsLoading(false);
  };

  // Error placeholder
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-neutral-200 dark:bg-neutral-800',
          aspectRatio && `aspect-[${aspectRatio}]`,
          className
        )}
      >
        <div className="text-center text-neutral-500">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm">تصویر یافت نشد</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        aspectRatio && !fill && `aspect-[${aspectRatio}]`,
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? calculatedWidth : undefined}
        height={!fill ? calculatedHeight : undefined}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'duration-200',
          isLoading ? 'scale-105 blur-sm' : 'scale-100 blur-0',
          fill ? 'object-cover' : 'h-full w-full object-cover'
        )}
      />

      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
      )}
    </div>
  );
}
