'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AuroraBackgroundProps {
  className?: string;
  /** شدت aurora (0-1) */
  intensity?: number;
  /** رنگ‌های aurora (پیش‌فرض: violet, blue, fuchsia) */
  colors?: string[];
  /** سرعت انیمیشن (ثانیه) */
  duration?: number;
}

/**
 * AuroraBackground — پس‌زمینه گرادینت مش پویا
 *
 * - سه blob رنگی که آهسته حرکت می‌کنن
 * - blur سنگین برای حس dreamy
 * - grid pattern overlay برای بافت
 * - GPU-friendly
 */
export function AuroraBackground({
  className,
  intensity = 1,
  colors = ['violet', 'blue', 'fuchsia'],
  duration = 24,
}: AuroraBackgroundProps) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500/30 via-fuchsia-400/20',
    blue: 'from-blue-500/25 via-cyan-400/15',
    fuchsia: 'from-fuchsia-500/20 via-pink-400/10',
    pink: 'from-rose-500/20 via-pink-400/10',
    cyan: 'from-cyan-500/20 via-sky-400/10',
    emerald: 'from-emerald-500/20 via-teal-400/10',
  };

  const [c1 = 'violet', c2 = 'blue', c3 = 'fuchsia'] = colors;

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      {/* Blob 1 */}
      <motion.div
        className={cn(
          'absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full blur-3xl',
          'bg-gradient-to-br',
          colorMap[c1],
          'to-transparent',
        )}
        style={{ opacity: intensity }}
        animate={{
          x: [0, 80, 0, -40, 0],
          y: [0, 40, -20, 30, 0],
          scale: [1, 1.15, 0.95, 1.1, 1],
        }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Blob 2 */}
      <motion.div
        className={cn(
          'absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full blur-3xl',
          'bg-gradient-to-tr',
          colorMap[c2],
          'to-transparent',
        )}
        style={{ opacity: intensity }}
        animate={{
          x: [0, -60, 20, -30, 0],
          y: [0, -30, 20, -10, 0],
          scale: [1, 1.1, 1.2, 0.95, 1],
        }}
        transition={{ duration: duration * 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Blob 3 (مرکز) */}
      <motion.div
        className={cn(
          'absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl',
          'bg-gradient-to-br',
          colorMap[c3],
          'to-transparent',
        )}
        style={{ opacity: intensity }}
        animate={{
          x: ['-50%', '-30%', '-50%', '-70%', '-50%'],
          y: ['-50%', '-70%', '-30%', '-50%', '-50%'],
          scale: [1, 1.2, 0.9, 1.15, 1],
        }}
        transition={{ duration: duration * 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
