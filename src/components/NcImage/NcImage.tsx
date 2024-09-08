import React, { type FC } from 'react';
import Image, { type ImageProps } from 'next/image';

export interface NcImageProps extends ImageProps {
  containerClassName?: string;
}

const NcImage: FC<NcImageProps> = ({
  containerClassName = '',
  alt = 'nc-imgs',
  className = 'object-cover w-full h-full',
  sizes = '(max-width: 600px) 480px, 800px',
  priority = false,
  ...args
}) => {
  return (
    <div className={containerClassName}>
      <Image className={className} alt={alt} sizes={sizes} priority={priority} {...args} />
    </div>
  );
};

export default NcImage;
