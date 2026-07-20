'use client';

import { motion, useMotionTemplate, useMotionValue } from '@/lib/motion-shim';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';

export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** رنگ نور spotlight (باید rgb باشه) */
  spotlightColor?: string;
  /** شدت tilt (3D rotation) */
  tiltIntensity?: number;
  /** آیا tilt فعال باشه؟ */
  enableTilt?: boolean;
  /** آیا spotlight فعال باشه؟ */
  enableSpotlight?: boolean;
  /** callback برای onClick */
  onClick?: () => void;
  /** href (اگه لینک باشه) */
  href?: string;
}

/**
 * کامپوننت پایه کارت با دو افکت مدرن:
 * 1. Spotlight — یه دایره نور که دنبال ماوس می‌چرخه
 * 2. 3D Tilt — کارت با ماوس کمی می‌چرخه (parallax سه‌بعدی)
 *
 * این کامپوننت به تنهایی render می‌شه. کلاس‌های بیرونی (رنگ، گرادینت، ...)
 * از طریق children یا className قابل تنظیمه.
 */
export function SpotlightCard({
  children,
  className = '',
  spotlightColor = '99, 102, 241', // indigo-500
  tiltIntensity = 6,
  enableTilt = true,
  enableSpotlight = true,
  onClick,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  // Spotlight position به صورت درصد
  const spotlightBg = useMotionTemplate`radial-gradient(350px circle at ${mouseX}% ${mouseY}%, rgba(${spotlightColor}, 0.18), transparent 60%)`;

  // مقادیر tilt
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const _rotateXSpring = useMotionValue(0);
  const _rotateYSpring = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseX.set((x / rect.width) * 100);
      mouseY.set((y / rect.height) * 100);

      if (enableTilt) {
        // محاسبه tilt بر اساس موقعیت ماوس
        const xPct = x / rect.width - 0.5;
        const yPct = y / rect.height - 0.5;
        rotateX.set(-yPct * tiltIntensity);
        rotateY.set(xPct * tiltIntensity);
      }
    },
    [mouseX, mouseY, rotateX, rotateY, tiltIntensity, enableTilt],
  );

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  const motionStyle = enableTilt
    ? {
        rotateX,
        rotateY,
        transformPerspective: 1200,
        transformStyle: 'preserve-3d' as const,
      }
    : undefined;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={motionStyle}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring' as const, stiffness: 280, damping: 22 }}
      className={`group/spotlight relative overflow-hidden rounded-2xl cursor-pointer ${className}`}
    >
      {/* لایه spotlight — فقط وقتی فعال باشه */}
      {enableSpotlight && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover/spotlight:opacity-100 transition-opacity duration-500"
          style={{ background: spotlightBg }}
        />
      )}
      {children}
    </motion.div>
  );
}
