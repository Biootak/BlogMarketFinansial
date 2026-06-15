'use client';

import type React from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import type { Variants } from '@/lib/motion-shim';

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

  // modern: نرم، لوکس، انیمیشن کم (برای header sticky)
  // default: انیمیشن قوی‌تر، چرخش و scale
  const logoVariants: Variants =
    variant === 'modern'
      ? {
          initial: { scale: 1, opacity: 1 },
          animate: { scale: 1, opacity: 1 },
          hover: {
            scale: 1.04,
            filter: 'brightness(1.05)',
            transition: {
              type: 'spring' as const,
              damping: 18,
              stiffness: 280,
              restDelta: 0.001,
            },
          },
        }
      : {
          initial: {
            scale: 0,
            opacity: 0,
            rotate: -360,
            filter: 'blur(10px)',
          },
          animate: {
            scale: 1,
            opacity: 1,
            rotate: 0,
            filter: 'blur(0px)',
            transition: {
              duration: 1.2,
              ease: 'easeOut' as const,
              scale: {
                type: 'spring' as const,
                damping: 12,
                stiffness: 100,
                restDelta: 0.001,
              },
            },
          },
          hover: {
            scale: 1.1,
            rotate: [0, 10, -10, 0],
            filter: 'brightness(1.2)',
            transition: {
              rotate: {
                duration: 0.6,
                ease: 'easeInOut' as const,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'reverse' as const,
              },
              scale: {
                type: 'spring' as const,
                damping: 5,
                stiffness: 300,
                restDelta: 0.001,
              },
            },
          },
        };

  return (
    <Link href="/" className={className} aria-label="صفحه اصلی">
      <motion.div
        variants={logoVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        style={{
          originX: 0.5,
          originY: 0.5,
          display: 'inline-flex',
        }}
      >
        {useImage ? (
          <Image
            className="block dark:hidden"
            src={img}
            alt="Logo"
            priority
          />
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9">
            <LogoSvg className="w-full h-full" />
          </div>
        )}
      </motion.div>
    </Link>
  );
};

export default Logo;
