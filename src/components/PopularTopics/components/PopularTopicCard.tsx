'use client';

import { motion } from '@/lib/motion-shim';
import {
  ArrowUpRight,
  BarChart,
  FileText,
  Hash,
  Heart,
  MessageCircle,
  Tag as TagIcon,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import type { TaxonomyType } from '@/types/types';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from './AnimatedCounter';
import { SpotlightCard } from './SpotlightCard';
import { TrendingBadge } from './TrendingBadge';
import { type CategoryColorConfig, getCategoryColor } from '../utils/categoryColors';

const ICON_MAP: Record<string, typeof Hash> = {
  Hash,
  Heart,
  TrendingUp,
  BarChart,
  FileText,
  MessageCircle,
  Tag: TagIcon,
};

export interface PopularTopicCardProps {
  taxonomy: TaxonomyType;
  index: number;
  /** آیا featured باشه (سایز بزرگ‌تر) */
  featured?: boolean;
  /** رنگ از قبل محاسبه شده (برای performance) */
  colorConfig?: CategoryColorConfig;
  /** rank برای نمایش در ترند (1، 2، 3) */
  rank?: number;
}

/**
 * کارت موضوع پرطرفدار — نسخه مدرن ۲۰۲۶
 * - Glassmorphism
 * - Spotlight hover
 * - 3D Tilt
 * - Animated Counter
 * - Trending badge برای ۳ تای اول
 * - Gradient border متحرک
 */
export function PopularTopicCard({
  taxonomy,
  index,
  featured = false,
  colorConfig,
  rank,
}: PopularTopicCardProps) {
  const color = colorConfig ?? getCategoryColor(taxonomy.color, index, taxonomy.id);
  const Icon = ICON_MAP[color.icon] ?? Hash;
  const isTopTrending = rank !== undefined && rank <= 3;

  // spotlight color از hex/rgb
  const spotlightColor = '255, 255, 255';

  return (
    <Link
      href={`/archive/category/${taxonomy.slug}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900 rounded-3xl"
      aria-label={`${taxonomy.name} - ${taxonomy.count} مقاله`}
    >
      <SpotlightCard
        spotlightColor={spotlightColor}
        tiltIntensity={featured ? 5 : 8}
        className={cn(
          'relative h-full',
          // Glassmorphism
          'bg-white/70 dark:bg-neutral-900/60',
          'backdrop-blur-xl backdrop-saturate-150',
          'border border-neutral-200/60 dark:border-neutral-800/60',
          'shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)]',
          // hover shadow
          'hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]',
          'transition-shadow duration-500',
        )}
      >
        {/* Gradient overlay — رنگی متحرک در پس‌زمینه */}
        <div
          className={cn(
            'absolute inset-0 opacity-60 dark:opacity-50',
            'bg-gradient-to-br transition-opacity duration-500',
            color.gradient,
            'group-hover/spotlight:opacity-90 dark:group-hover/spotlight:opacity-80',
          )}
        />

        {/* Content */}
        <div
          className={cn(
            'relative z-10 flex h-full flex-col justify-between p-4 sm:p-5',
            featured ? 'min-h-[180px] sm:min-h-[200px]' : 'min-h-[140px] sm:min-h-[150px]',
          )}
        >
          {/* Top row — Icon + Trending badge */}
          <div className="flex items-start justify-between">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring' as const,
                stiffness: 200,
                damping: 15,
                delay: 0.1 + index * 0.05,
              }}
              className={cn(
                'relative flex items-center justify-center rounded-2xl',
                color.bgSoft,
                color.text,
                featured ? 'h-12 w-12' : 'h-10 w-10',
                'ring-1 ring-inset',
                color.border,
                'shadow-sm',
              )}
            >
              <Icon
                className={cn(
                  featured ? 'h-6 w-6' : 'h-5 w-5',
                  'transition-transform duration-500 group-hover/spotlight:scale-110 group-hover/spotlight:rotate-3',
                )}
                strokeWidth={2.2}
              />
            </motion.div>

            {isTopTrending && <TrendingBadge rank={rank} accentClass={color.accent} />}
          </div>

          {/* Middle — Title */}
          <div className="mt-4">
            <h3
              className={cn(
                'font-bold text-neutral-900 dark:text-neutral-50',
                'leading-tight',
                featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg',
                'tracking-tight',
              )}
            >
              {taxonomy.name}
            </h3>
            <p
              className={cn(
                'mt-1.5 flex items-center gap-1.5',
                'text-neutral-600 dark:text-neutral-400',
                featured ? 'text-sm' : 'text-xs sm:text-sm',
              )}
            >
              <AnimatedCounter
                value={taxonomy.count}
                className="font-bold tabular-nums"
                duration={1.6}
              />
              <span>مقاله</span>
            </p>
          </div>

          {/* Bottom — Arrow + hover effect */}
          <div className="mt-3 flex items-center justify-end">
            <motion.div
              initial={{ x: -8, opacity: 0 }}
              whileHover={{ x: 0, opacity: 1 }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                'bg-neutral-900/5 dark:bg-white/5',
                'text-neutral-700 dark:text-neutral-300',
                'opacity-0 -translate-x-2',
                'group-hover/spotlight:opacity-100 group-hover/spotlight:translate-x-0',
                'transition-all duration-300',
              )}
            >
              <ArrowUpRight className="h-4 w-4 -scale-x-100" strokeWidth={2.5} />
            </motion.div>
          </div>
        </div>

        {/* Bottom shine — یه خط نور متحرک در پایین */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-px',
            'bg-gradient-to-r from-transparent via-current to-transparent',
            color.text,
            'opacity-30',
          )}
        />
      </SpotlightCard>
    </Link>
  );
}
