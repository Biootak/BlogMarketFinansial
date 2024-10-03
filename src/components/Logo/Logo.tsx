import type React from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import * as motion from 'framer-motion/client';

import logoImg from '@/images/logo.png';
import logoLightImg from '@/images/logo-light.png';
import LogoSvg from './LogoSvg';

interface LogoProps {
  img?: StaticImageData;
  imgLight?: StaticImageData;
  useImage?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  img = logoImg,
  imgLight = logoLightImg,
  useImage = false,
  className = '',
}) => {
  if (!img || !imgLight) {
    throw new Error('Missing image URLs in Logo component');
  }

  const logoVariants = {
    initial: { scale: 0.9, opacity: 0, rotate: -180 },
    animate: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration: 0.8,
      },
    },
    hover: {
      scale: 1.05,
      rotate: 360,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 10,
        duration: 1,
      },
    },
  };

  return (
    <Link
      href="/"
      className={`ttnc-logo inline-block text-primary-6000 flex-shrink-0 ${className}`}
    >
      <motion.div
        initial="initial"
        animate="animate"
        whileHover="hover"
        variants={logoVariants}
        style={{ originX: 0.5, originY: 0.5 }}
      >
        {useImage ? (
          <Image
            src={img}
            alt="Logo"
            width={150}
            height={50}
            className={`${className} transition-all duration-300 hover:drop-shadow-lg`}
          />
        ) : (
          <LogoSvg className={`${className} transition-all duration-300 hover:drop-shadow-lg`} />
        )}
      </motion.div>
    </Link>
  );
};

export default Logo;
