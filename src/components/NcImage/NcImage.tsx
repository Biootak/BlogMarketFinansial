import type React from 'react';
import Image, { type ImageProps } from 'next/image';

export interface NcImageProps extends Omit<ImageProps, 'alt'> {
  containerClassName?: string;
  alt: string;
}

const NcImage: React.FC<NcImageProps> = ({
  containerClassName = '',
  alt,
  className = 'object-cover w-full h-full',
  sizes = '(max-width: 600px) 480px, 800px',
  priority = false,
  ...args
}) => {
  return (
    <div className={`relative ${containerClassName}`}>
      <Image className={className} alt={alt} sizes={sizes} priority={priority} {...args} />
    </div>
  );
};

export default NcImage;
