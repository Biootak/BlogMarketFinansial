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

// 2026-06-14: the project has dozens of remote hostnames in next.config.ts
// (pexels, unsplash, liara, vercel, google avatars, github, jsdelivr, ...).
// Adding yet another one to that allowlist each time a seed row ships a
// new placeholder hostname is a never-ending game and crashes the page
// the moment a contributor forgets. So instead of asking next/image to
// proxy an unknown host, we fall back to a plain <img>. The page never
// breaks, the user still sees the avatar, and we don't have to bounce
// the dev server every time.
//
// next/image still gets used for the hostnames we DO proxy (everything
// in next.config.ts), which is what we want for LCP/optimization.
const isNextImageHost = (raw: string): boolean => {
  if (raw.startsWith('/')) return true; // local /uploads/...
  if (raw.startsWith('data:')) return true; // inline
  try {
    const { hostname } = new URL(raw);
    // Patterns must match next.config.ts remotePatterns entries
    return (
      hostname === 'images.pexels.com' ||
      hostname === 'images.unsplash.com' ||
      hostname === 'biotak.storage.c2.liara.space' ||
      hostname.endsWith('.storage.c2.liara.space') ||
      hostname === 'avatar.vercel.sh' ||
      hostname === 'lh3.googleusercontent.com' ||
      hostname === 'avatars.githubusercontent.com' ||
      hostname === 'cdn.jsdelivr.net' ||
      hostname === 'i.pravatar.cc'
    );
  } catch {
    return false;
  }
};

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
  const useNextImage = rawUrl !== '' && isNextImageHost(rawUrl);

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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
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
