/**
 * ModernTrending — نسخه refined "موضوعات پرطرفدار"
 *
 * المان‌های اصلی:
 * - Bento Grid نامتقارن با featured card بزرگ
 * - Aurora Background low-saturation
 * - Magnetic Hover
 * - 3D Tilt (subtle)
 * - Shimmer line (subtle)
 * - Marquee Ticker (CSS-driven)
 * - LiveIndicator
 * - Morphing Underline
 *
 * استفاده:
 * ```tsx
 * import ModernTrendingTopics from '@/components/ModernTrending';
 * <ModernTrendingTopics categories={categories} />
 * ```
 */

export { default } from './ModernTrendingTopics';
export { default as ModernTrendingTopics } from './ModernTrendingTopics';
export { AuroraBackground } from './effects/AuroraBackground';
export { LiveIndicator } from './effects/LiveIndicator';
export { Magnetic } from './effects/Magnetic';
export { Marquee } from './effects/Marquee';
export { Shimmer } from './effects/Shimmer';
export { TextGradient } from './effects/TextGradient';
export { TiltCard } from './effects/TiltCard';
export type { ModernTrendingTopicsProps } from './ModernTrendingTopics';
