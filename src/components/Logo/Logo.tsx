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
    initial: { 
      scale: 0,
      opacity: 0,
      rotate: -360,
      filter: "blur(10px)"
    },
    animate: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      filter: "blur(0px)",
      transition: {
        duration: 1.2,
        ease: "easeOut",
        scale: {
          type: "spring",
          damping: 12,
          stiffness: 100,
          restDelta: 0.001
        }
      }
    },
    hover: {
      scale: 1.1,
      rotate: [0, 10, -10, 0],
      filter: "brightness(1.2)",
      transition: {
        rotate: {
          duration: 0.6,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse"
        },
        scale: {
          type: "spring",
          damping: 5,
          stiffness: 300,
          restDelta: 0.001
        }
      }
    }
  };

  return (
    <Link href="/" className={className}>
      <motion.div
        variants={logoVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        style={{ 
          originX: 0.5, 
          originY: 0.5,
          display: 'inline-block'
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
          <div className="w-16 h-16">
            <LogoSvg className="w-full h-full" />
          </div>
        )}
      </motion.div>
    </Link>
  );
};

export default Logo;
