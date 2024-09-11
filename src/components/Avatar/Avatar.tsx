'use client';

import Image, { type StaticImageData } from 'next/image';
import React, { type FC, useEffect, useState } from 'react';

export interface AvatarProps {
  containerClassName?: string;
  sizeClass?: string;
  radius?: string;
  imgUrl?: string | StaticImageData | null;
  userName?: string | null;
  fontSize?: string;
}

const Avatar: FC<AvatarProps> = ({
  containerClassName = 'ring-1 ring-white dark:ring-neutral-900',
  sizeClass = 'h-10 w-10',
  radius = 'rounded-full',
  imgUrl,
  userName,
  fontSize = 'text-sm',
}) => {
  const name = (userName != null ? String(userName).trim() : '') || 'کاربر ناشناس';
  const initial = name.charAt(0).toUpperCase();

  const [url, setUrl] = useState<string | StaticImageData | null | undefined>(imgUrl);

  useEffect(() => {
    if (!imgUrl) {
      setUrl(`https://avatar.vercel.sh/${encodeURIComponent(name)}?size=80`);
    } else {
      setUrl(imgUrl);
    }
  }, [imgUrl, name]);

  const isCustomImage = !!imgUrl;

  return (
    <div
      className={`wil-avatar relative flex items-center justify-center overflow-hidden font-sans text-white uppercase font-semibold shadow-inner ${radius} ${sizeClass} ${containerClassName}`}
    >
      {url && typeof url === 'string' && (
        <Image
          fill
          sizes="100px"
          className="absolute inset-0 w-full h-full object-cover"
          src={url}
          alt={name}
        
        />
      )}
      {!isCustomImage && (
        <>
          <div className="absolute inset-0 bg-black bg-opacity-30" />
          <span
            className={`relative z-10 ${fontSize} font-bold tracking-wider drop-shadow-md items-center justify-center text-white uppercase`}
          >
            {initial}
          </span>
        </>
      )}
    </div>
  );
};

export default Avatar;
