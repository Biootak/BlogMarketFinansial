'use client';

import { cn } from '@/lib/utils';
import { Play, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export interface ResponsiveVideoProps {
  src: string;
  poster?: string;
  aspectRatio?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
}

/**
 * Responsive Video Component
 * - Aspect ratio container to prevent CLS
 * - Native fullscreen controls on mobile
 * - Lazy loading with intersection observer
 */
export function ResponsiveVideo({
  src,
  poster,
  aspectRatio = '16/9',
  className,
  autoPlay = false,
  controls = true,
}: ResponsiveVideoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden',
          `aspect-[${aspectRatio}]`,
          className,
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
          <Play className="w-12 h-12 text-neutral-400" />
          <p className="text-sm text-neutral-500 text-center">خطا در بارگذاری ویدیو</p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تلاش مجدد</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden',
        `aspect-[${aspectRatio}]`,
        className,
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <video
        src={src}
        poster={poster}
        controls={controls}
        autoPlay={autoPlay}
        playsInline
        onError={handleError}
        onLoadedData={handleLoad}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}

/**
 * Responsive Audio Player
 * - Compact controls on mobile
 */
export function ResponsiveAudio({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={cn('p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg', className)}>
        <p className="text-sm text-neutral-500">خطا در بارگذاری فایل صوتی</p>
      </div>
    );
  }

  return (
    <audio
      src={src}
      controls
      onError={() => setHasError(true)}
      className={cn('w-full h-12', className)}
    />
  );
}

/**
 * Responsive Iframe (for embeds)
 * - Lazy loading
 * - Aspect ratio container
 */
export function ResponsiveIframe({
  src,
  title,
  aspectRatio = '16/9',
  className,
}: {
  src: string;
  title: string;
  aspectRatio?: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={cn(
          'relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center',
          `aspect-[${aspectRatio}]`,
          className,
        )}
      >
        <p className="text-sm text-neutral-500">خطا در بارگذاری محتوا</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden',
        `aspect-[${aspectRatio}]`,
        className,
      )}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        onError={() => setHasError(true)}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
