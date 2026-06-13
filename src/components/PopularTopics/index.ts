/**
 * PopularTopics — مجموعه کامپوننت‌های مدرن ۲۰۲۶ برای نمایش موضوعات پرطرفدار
 *
 * استفاده:
 * ```tsx
 * import PopularTopicsBento from '@/components/PopularTopics';
 *
 * <PopularTopicsBento categories={popularCategories} />
 * ```
 */

export { default } from './PopularTopicsBento';
export { default as PopularTopicsBento } from './PopularTopicsBento';
export { PopularTopicCard } from './components/PopularTopicCard';
export { SpotlightCard } from './components/SpotlightCard';
export { AnimatedCounter } from './components/AnimatedCounter';
export { TrendingBadge } from './components/TrendingBadge';
export {
  getCategoryColor,
  CATEGORY_COLOR_MAP,
  DEFAULT_CATEGORY_COLOR,
} from './utils/categoryColors';
export type { CategoryColorConfig } from './utils/categoryColors';
export type { PopularTopicsBentoProps } from './PopularTopicsBento';
export type { PopularTopicCardProps } from './components/PopularTopicCard';
export type { SpotlightCardProps } from './components/SpotlightCard';
export type { AnimatedCounterProps } from './components/AnimatedCounter';
export type { TrendingBadgeProps } from './components/TrendingBadge';
