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
  variant?: 'default' | 'modern';
}

const Logo: React.FC<LogoProps> = ({
  img = logoImg,
  imgLight = logoLightImg,
  useImage = false,
  className = '',
  variant = 'default',
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
    tap: { scale: 0.9 },
  };

  return (
    <Link href="/" className={`inline-block ${className}`}>
      <motion.div
        variants={logoVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
        style={{ originX: 0.5, originY: 0.5 }}
      >
        {useImage ? (
          <Image
            className="block dark:hidden"
            src={img}
            alt="Logo"
            priority
          />
        ) : (
          <div className="w-16 h-16">
            <LogoSvg className="w-full h-full" />
          </div>
        )}
      </motion.div>
    </Link>
  );
};

export default Logo;
