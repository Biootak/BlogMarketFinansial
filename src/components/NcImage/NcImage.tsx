'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import Image, { type ImageProps } from 'next/image';

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

  // آپدیت imgSrc وقتی src تغییر میکنه
  useEffect(() => {
    if (src) {
      setImgSrc(src);
      setHasError(false);
    }
  }, [src]);

  // اگر containerClassName شامل absolute یا inset باشه، aspectRatio رو اعمال نکن
  const hasAbsolutePosition = containerClassName.includes('absolute') || containerClassName.includes('inset');

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  // تشخیص SVG برای غیرفعال کردن optimization
  const isSvg = typeof imgSrc === 'string' && imgSrc.includes('.svg');

  return (
    <div
      className={`relative ${containerClassName}`}
      style={hasAbsolutePosition ? undefined : { aspectRatio: ratio }}
    >
      <Image
        className={className}
        alt={alt}
        sizes={sizes}
        priority={priority}
        fill={fill}
        src={imgSrc}
        onError={handleError}
        unoptimized={isSvg}
        {...props}
      />
    </div>
  );
};

export default NcImage;
