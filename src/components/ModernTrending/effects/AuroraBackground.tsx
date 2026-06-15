/**
 * AuroraBackground — پس‌زمینه گرادینت مش پویا (CSS-driven, server component)
 *
 * - Pure CSS keyframes → 0 KB client JS, runs on compositor thread
 * - prefers-reduced-motion: global CSS rule clamps animation to 0.01ms
 * - GPU containment via [contain:layout_paint]
 *
 * Note: این نسخه server component شده چون هیچ state/effect نداره. فریم‌ورک
 * Next.js به طور خودکار RSC payload embed می‌کنه و client hydration cost صفر
 * میشه (مهم‌ترین optimization).
 */

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
  // duration برای backwards compat نگه داشته شده، keyframe از CSS میاد
  duration: _duration = 32,
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        '[contain:layout_paint]',
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute -top-40 -end-40 h-[480px] w-[480px] rounded-full anim-aurora-a"
        style={{
          background: `radial-gradient(circle, ${accentA} 0%, transparent 70%)`,
          opacity: intensity,
          filter: 'blur(80px)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
      <div
        className="absolute -bottom-40 -start-40 h-[420px] w-[420px] rounded-full anim-aurora-b"
        style={{
          background: `radial-gradient(circle, ${accentB} 0%, transparent 70%)`,
          opacity: intensity * 0.8,
          filter: 'blur(80px)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
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
