import React from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';

import logoImg from '@/images/logo.png';
import logoLightImg from '@/images/logo-light.png';
import LogoSvg from './LogoSvg';

interface LogoProps {
  img?: StaticImageData;
  imgLight?: StaticImageData;
  useImage?: boolean;
  className?: string;
}

const Logo = ({
  img = logoImg,
  imgLight = logoLightImg,
  useImage = false,
  className = '',
}: LogoProps) => {
  if (!img || !imgLight) {
    throw new Error('Missing image URLs in Logo component');
  }

  return (
    <Link
      href="/"
      className={`ttnc-logo inline-block text-primary-6000 flex-shrink-0 ${className}`}
    >
      {useImage ? (
        <Image src={img} alt="Logo" width={150} height={50} className={className} />
      ) : (
        <LogoSvg className={className} />
      )}
    </Link>
  );
};

export default Logo;
