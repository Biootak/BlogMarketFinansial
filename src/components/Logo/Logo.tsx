'use client';

import { motion } from '@/lib/motion-shim';
import type { Variants } from '@/lib/motion-shim';
import Link from 'next/link';
import type React from 'react';

import LogoSvg from './LogoSvg';

interface LogoProps {
  /**
   * Optional override URL for the logo. When set, renders an `<img>`
   * with this URL (covers the admin-uploaded logo case — e.g. a real
   * brand mark in PNG/SVG stored in `public/uploads/` or a CDN).
   *
   * When empty / undefined, the default inline SVG (`<LogoSvg />`) is
   * rendered. The inline SVG uses `currentColor` so it adapts to light
   * AND dark themes without any image assets.
   */
  logoUrl?: string;
  className?: string;
  /**
   * Animation flavor:
   *   • `modern` — subtle hover scale only (for header sticky contexts)
   *   • `default` — entrance animation + playful hover (for hero / sidebar)
   */
  variant?: 'default' | 'modern';
}

const Logo: React.FC<LogoProps> = ({ logoUrl, className = '', variant = 'default' }) => {
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
        {logoUrl ? (
          // Custom uploaded logo — admin override path. Falls back to
          // the inline SVG when the URL is empty.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain sm:h-11" />
        ) : (
          // Default inline SVG. Uses `currentColor` so it follows the
          // surrounding text color (light text on dark header, dark
          // text on light header) without any image asset.
          <span className="inline-flex h-10 w-10 items-center justify-center text-foreground sm:h-11 sm:w-11">
            <LogoSvg className="h-full w-full" />
          </span>
        )}
      </motion.div>
    </Link>
  );
};

export default Logo;
