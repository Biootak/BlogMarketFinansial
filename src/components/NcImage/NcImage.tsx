'use client';

import Image, { type ImageProps } from 'next/image';
import type React from 'react';
import { useEffect, useState } from 'react';

export interface NcImageProps extends Omit<ImageProps, 'alt'> {
  containerClassName?: string;
  alt: string;
  ratio?: string;
  fallbackSrc?: string;
}

const NcImage: React.FC<NcImageProps> = ({
  containerClassName = '',
  alt,
  className = 'object-cover',
  sizes = '(max-width: 600px) 480px, 800px',
  priority = false,
  fill = true,
  ratio = '16/9',
  fallbackSrc = '/images/placeholder-large.png',
  src,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // آپدیت imgSrc وقتی src تغییر میکنه
  useEffect(() => {
    if (src) {
      setImgSrc(src);
      setHasError(false);
      setIsLoading(true);
    }
  }, [src]);

  // اگر containerClassName شامل absolute یا inset باشه، aspectRatio رو اعمال نکن
  const hasAbsolutePosition =
    containerClassName.includes('absolute') || containerClassName.includes('inset');

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // تشخیص SVG برای غیرفعال کردن optimization
  const isSvg = typeof imgSrc === 'string' && imgSrc.includes('.svg');

  return (
    <div
      className={`relative ${containerClassName}`}
      style={hasAbsolutePosition ? undefined : { aspectRatio: ratio }}
    >
      <Image
        className={`${className} transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        alt={alt}
        sizes={sizes}
        priority={priority}
        fill={fill}
        src={imgSrc}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={isSvg}
        {...props}
      />
      
      {/* Loading placeholder with shimmer effect */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-shimmer" />
        </div>
      )}
    </div>
  );
};

export default NcImage;
