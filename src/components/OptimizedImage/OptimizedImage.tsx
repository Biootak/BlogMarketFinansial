import Image, { type ImageProps } from 'next/image';
import { type FC } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
}

/**
 * OptimizedImage component that automatically uses WebP format with fallback
 * 
 * Usage:
 * <OptimizedImage 
 *   src="/images/hero.png" 
 *   alt="Hero" 
 *   width={800} 
 *   height={600} 
 * />
 * 
 * This will automatically try to load /images/hero.webp first,
 * and fall back to /images/hero.png if WebP is not supported
 */
const OptimizedImage: FC<OptimizedImageProps> = ({ src, fallbackSrc, alt, ...props }) => {
  // Convert image path to WebP
  const getWebPPath = (imagePath: string): string => {
    // If already WebP, return as is
    if (imagePath.endsWith('.webp')) {
      return imagePath;
    }

    // Replace extension with .webp
    return imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  };

  const webpSrc = getWebPPath(src);
  const finalFallbackSrc = fallbackSrc || src;

  return (
    <picture>
      {/* WebP source for modern browsers */}
      <source srcSet={webpSrc} type="image/webp" />
      
      {/* Fallback for browsers that don't support WebP */}
      <Image src={finalFallbackSrc} alt={alt} {...props} />
    </picture>
  );
};

export default OptimizedImage;
