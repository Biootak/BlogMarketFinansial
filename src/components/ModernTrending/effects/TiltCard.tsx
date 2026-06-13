'use client';

import { motion, type MotionValue, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { type ReactNode, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** شدت tilt (پیشنهاد 8-15) */
  intensity?: number;
  /** Glare effect (نور منعکس) */
  glare?: boolean;
  /** perspective (پیش‌فرض 1200) */
  perspective?: number;
}

/**
 * TiltCard3D — کارت سه‌بعدی با tilt و glare
 *
 * - وقتی ماوس می‌ره روی کارت، کمی به سمت ماوس tilt می‌شه
 * - یه glare (نور) که دنبال ماوس می‌چرخه
 * - spring نرم برای بازگشت
 * - GPU-accelerated
 */
export function TiltCard({
  children,
  className,
  intensity = 10,
  glare = true,
  perspective = 1200,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  // spring نرم برای tilt
  const rotateX = useSpring(useTransform(useMotionValue(0), (v) => v), {
    stiffness: 280,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(useMotionValue(0), (v) => v), {
    stiffness: 280,
    damping: 22,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-yPct * intensity);
    rotateY.set(xPct * intensity);
    mouseX.set(((e.clientX - rect.left) / rect.width) * 100);
    mouseY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: perspective,
        transformStyle: 'preserve-3d',
      }}
      className={cn('relative', className)}
    >
      {children}
      {glare && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: useTransform(
              [mouseX, mouseY] as [MotionValue<number>, MotionValue<number>],
              ([x, y]) =>
                `radial-gradient(400px circle at ${x}% ${y}%, rgba(255,255,255,0.18), transparent 60%)`,
            ),
          }}
        />
      )}
    </motion.div>
  );
}
