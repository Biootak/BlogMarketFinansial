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

// 2026-06-30: use next/image for all avatars. Remote placeholders use
// the `unoptimized` prop, which skips the optimization pipeline and the
// next.config.ts remotePatterns allowlist. This avoids the previous bug
// where a missing hostname crashed the page, while still keeping a single
// image component API and lazy-loading behavior. Local /uploads/... still
// go through the optimized path because they are served by this app.
const isLocalUploads = (raw: string): boolean => raw.startsWith('/uploads/');

const Avatar: FC<AvatarProps> = ({
  containerClassName = 'ring-1 ring-white dark:ring-neutral-900',
  sizeClass = 'h-10 w-10',
  radius = 'rounded-full',
  imgUrl,
  userName,
  fontSize = 'text-sm',
}) => {
  const name = userName != null ? String(userName).trim() : '';
  const initial = name.charAt(0).toUpperCase();

  const [url, setUrl] = useState<string | StaticImageData | null | undefined>(imgUrl);
  const [hasImage, setHasImage] = useState(!!imgUrl);

  useEffect(() => {
    if (!imgUrl) {
      const avatarName = name || 'user';
      setUrl(`https://avatar.vercel.sh/${encodeURIComponent(avatarName)}?size=80`);
      setHasImage(true);
    } else {
      setUrl(imgUrl);
      setHasImage(true);
    }
  }, [imgUrl, name]);

  const rawUrl = typeof url === 'string' ? url : '';
  const useNextImage = rawUrl !== '' && isLocalUploads(rawUrl);

  return (
    <div
      className={`wil-avatar relative flex items-center justify-center overflow-hidden font-sans text-white uppercase font-semibold shadow-inner ${radius} ${sizeClass} ${containerClassName}`}
    >
      {useNextImage && typeof url === 'string' && (
        <Image
          fill
          sizes="100px"
          className="absolute inset-0 w-full h-full object-cover"
          src={url}
          alt={name}
        />
      )}
      {!useNextImage && typeof url === 'string' && url && (
        <Image
          unoptimized
          fill
          sizes="80px"
          src={url}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      {!hasImage && (
        <>
          <div className="absolute inset-0 bg-neutral-500" />
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
