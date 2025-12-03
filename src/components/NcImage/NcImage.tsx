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
  return (
    <div className={`relative ${containerClassName}`} style={{ aspectRatio: ratio }}>
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
