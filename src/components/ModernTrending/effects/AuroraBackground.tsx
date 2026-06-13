'use client';

/**
 * AuroraBackground — پس‌زمینه گرادینت مش پویا (نسخه refined)
 *
 * تغییرات نسبت به نسخه قبل:
 * - رنگ‌ها کم‌اشباع‌تر (neutral + یک tint) — الهام از Linear/Vercel
 * - blur کمتر (80px نه 3xl) برای ظرافت
 * - ۲ blob نه ۳
 * - opacity پایین‌تر (0.4 نه 1)
 * - GPU containment برای performance
 */

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AuroraBackgroundProps {
  className?: string;
  /** شدت (0-1) */
  intensity?: number;
  /** دو رنگ اصلی — اگه داده نشه، از طیف neutral + یک accent استفاده می‌کنه */
  accentA?: string;
  accentB?: string;
  duration?: number;
}

export function AuroraBackground({
  className,
  intensity = 0.5,
  accentA = 'var(--aurora-a)',
  accentB = 'var(--aurora-b)',
  duration = 32,
}: AuroraBackgroundProps) {
  const reduce = useReducedMotion();

  const blobTransition = reduce
    ? { duration: 0 }
    : { duration, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        // GPU containment
        '[contain:layout_paint]',
        className,
      )}
      aria-hidden
      style={{ contain: 'layout paint' }}
    >
      {/* Blob 1 — top-right */}
      <motion.div
        className="absolute -top-40 -end-40 h-[480px] w-[480px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${accentA} 0%, transparent 70%)`,
          opacity: intensity,
          filter: 'blur(80px)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={
          reduce
            ? undefined
            : {
                x: [0, 60, -20, 0],
                y: [0, 30, -40, 0],
                scale: [1, 1.08, 0.96, 1],
              }
        }
        transition={blobTransition}
      />

      {/* Blob 2 — bottom-left */}
      <motion.div
        className="absolute -bottom-40 -start-40 h-[420px] w-[420px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${accentB} 0%, transparent 70%)`,
          opacity: intensity * 0.8,
          filter: 'blur(80px)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={
          reduce
            ? undefined
            : {
                x: [0, -50, 30, 0],
                y: [0, -30, 20, 0],
                scale: [1, 1.05, 1.1, 1],
              }
        }
        transition={blobTransition}
      />

      {/* Hairline grid — بسیار subtle */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(127,127,127,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(127,127,127,0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at center, black 0%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at center, black 0%, transparent 75%)',
        }}
      />
    </div>
  );
}
