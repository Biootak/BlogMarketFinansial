import type React from 'react';
import Image, { type ImageProps } from 'next/image';

export interface NcImageProps extends Omit<ImageProps, 'alt'> {
  containerClassName?: string;
  alt: string;
  ratio?: string;
}

const NcImage: React.FC<NcImageProps> = ({
  containerClassName = '',
  alt,
  className = 'object-cover',
  sizes = '(max-width: 600px) 480px, 800px',
  priority = false,
  fill = true,
  ratio = '16/9',
  ...props
}) => {
  // اگر containerClassName شامل absolute یا inset باشه، aspectRatio رو اعمال نکن
  const hasAbsolutePosition = containerClassName.includes('absolute') || containerClassName.includes('inset');
  
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
        {...props}
      />
    </div>
  );
};

export default NcImage;
