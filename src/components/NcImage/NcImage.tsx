'use client';

import { SafeImage, type SafeImageProps } from '@/components/SafeImage';
/**
 * NcImage — نسخه‌ی بهبودیافته که:
 *  - به جای fallback hard-coded URL، SafeImage placeholder استفاده می‌کنه
 *  - وقتی src خالی باشه یا خطا بده، گرادینت + آیکون نشون می‌ده
 *  - API سازگار با نسخه‌ی قبلی (همون propها)
 */
import type React from 'react';

type NcOnlyImgProps = Omit<SafeImageProps, 'alt' | 'variant'> &
  Pick<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'>;

const NcImage: React.FC<NcOnlyImgProps> = ({ alt, ...rest }) => {
  return <SafeImage variant="card" alt={alt ?? ''} {...rest} />;
};

export default NcImage;
