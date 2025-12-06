'use client';

import { cn } from '@/lib/utils';
import type { FC, ReactNode } from 'react';

// Base Skeleton with shimmer effect
interface SkeletonBaseProps {
  className?: string;
  children?: ReactNode;
}

export const SkeletonBase: FC<SkeletonBaseProps> = ({ className, children }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-lg bg-gradient-to-r',
      'from-gray-200 via-gray-100 to-gray-200',
      'dark:from-gray-800 dark:via-gray-700 dark:to-gray-800',
      'before:absolute before:inset-0 before:-translate-x-full',
      'before:animate-[shimmer_2s_infinite]',
      'before:bg-gradient-to-r before:from-transparent',
      'before:via-white/20 before:to-transparent',
      'dark:before:via-white/5',
      className,
    )}
  >
    {children}
  </div>
);

// ============================================
// Dashboard Page Skeleton
// ============================================
export const DashboardPageSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table */}
    <TableSkeleton rows={5} />
  </div>
);

// ============================================
// Stats Card Skeleton
// ============================================
export const StatsCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'relative p-5 rounded-2xl',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
      'shadow-sm',
      className,
    )}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-3 flex-1">
        <SkeletonBase className="h-4 w-24 rounded-md" />
        <SkeletonBase className="h-8 w-20 rounded-lg" />
        <SkeletonBase className="h-3 w-32 rounded-md" />
      </div>
      <SkeletonBase className="h-12 w-12 rounded-xl" />
    </div>
  </div>
);

// ============================================
// Chart Skeleton
// ============================================
export const ChartSkeleton: FC<{ className?: string; height?: string }> = ({
  className,
  height = 'h-72',
}) => (
  <div
    className={cn(
      'p-6 rounded-2xl',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
      className,
    )}
  >
    <div className="flex items-center justify-between mb-6">
      <SkeletonBase className="h-5 w-32 rounded-md" />
      <div className="flex gap-2">
        <SkeletonBase className="h-8 w-20 rounded-lg" />
        <SkeletonBase className="h-8 w-20 rounded-lg" />
      </div>
    </div>
    <SkeletonBase className={cn(height, 'w-full rounded-xl')} />
  </div>
);

// ============================================
// Table Skeleton
// ============================================
interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
  showHeader?: boolean;
  showActions?: boolean;
}

export const TableSkeleton: FC<TableSkeletonProps> = ({
  rows = 5,
  cols = 4,
  className,
  showHeader = true,
  showActions = true,
}) => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
      className,
    )}
  >
    {showHeader && (
      <div className="px-6 py-4 border-b border-gray-100/60 dark:border-gray-700/40">
        <div className="flex items-center justify-between">
          <SkeletonBase className="h-6 w-40 rounded-lg" />
          <div className="flex gap-3">
            <SkeletonBase className="h-10 w-48 rounded-xl" />
            <SkeletonBase className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>
    )}
    <div className="divide-y divide-gray-100/60 dark:divide-gray-700/40">
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 flex items-center gap-4">
          {/* Avatar */}
          <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />

          {/* Content columns */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <SkeletonBase className="h-4 w-full rounded-md" />
              <SkeletonBase className="h-3 w-2/3 rounded-md" />
            </div>
            <SkeletonBase className="h-6 w-20 rounded-full self-center" />
            <SkeletonBase className="h-4 w-24 rounded-md self-center" />
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 flex-shrink-0">
              <SkeletonBase className="h-8 w-16 rounded-lg" />
              <SkeletonBase className="h-8 w-16 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Users Table Skeleton
// ============================================
export const UsersTableSkeleton: FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-40 rounded-lg" />
        <SkeletonBase className="h-4 w-56 rounded-md" />
      </div>
      <div className="flex flex-wrap gap-3">
        <SkeletonBase className="h-10 w-32 rounded-xl" />
        <SkeletonBase className="h-10 w-32 rounded-xl" />
        <SkeletonBase className="h-10 w-48 rounded-xl" />
        <SkeletonBase className="h-10 w-32 rounded-xl" />
      </div>
    </div>

    {/* Table */}
    <TableSkeleton rows={rows} />
  </div>
);

// ============================================
// Posts List Skeleton
// ============================================
export const PostsListSkeleton: FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-32 rounded-lg" />
        <SkeletonBase className="h-4 w-48 rounded-md" />
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="h-10 w-48 rounded-xl" />
        <SkeletonBase className="h-10 w-36 rounded-xl" />
      </div>
    </div>

    {/* Posts Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(rows)].map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================
// Post Card Skeleton
// ============================================
export const PostCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
      className,
    )}
  >
    {/* Image */}
    <SkeletonBase className="h-48 w-full rounded-none" />

    {/* Content */}
    <div className="p-5 space-y-4">
      {/* Categories */}
      <div className="flex gap-2">
        <SkeletonBase className="h-6 w-16 rounded-full" />
        <SkeletonBase className="h-6 w-20 rounded-full" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <SkeletonBase className="h-5 w-full rounded-md" />
        <SkeletonBase className="h-5 w-3/4 rounded-md" />
      </div>

      {/* Excerpt */}
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-full rounded-md" />
        <SkeletonBase className="h-3 w-5/6 rounded-md" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <SkeletonBase className="h-8 w-8 rounded-full" />
          <SkeletonBase className="h-3 w-20 rounded-md" />
        </div>
        <SkeletonBase className="h-3 w-16 rounded-md" />
      </div>
    </div>
  </div>
);

// ============================================
// Settings Page Skeleton
// ============================================
export const SettingsPageSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <SkeletonBase className="h-8 w-36 rounded-lg" />
      <SkeletonBase className="h-4 w-64 rounded-md" />
    </div>

    {/* Tabs */}
    <div className="flex gap-2 border-b border-gray-200/60 dark:border-gray-700/40 pb-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonBase key={i} className="h-10 w-28 rounded-xl" />
      ))}
    </div>

    {/* Settings Card */}
    <SettingsCardSkeleton />
  </div>
);

// ============================================
// Settings Card Skeleton
// ============================================
export const SettingsCardSkeleton: FC = () => (
  <div
    className={cn(
      'p-6 rounded-2xl space-y-6',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
    )}
  >
    {/* Section Header */}
    <div className="space-y-2 pb-4 border-b border-gray-100/60 dark:border-gray-700/40">
      <SkeletonBase className="h-5 w-40 rounded-md" />
      <SkeletonBase className="h-3 w-64 rounded-md" />
    </div>

    {/* Form Fields */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
    </div>

    {/* Actions */}
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100/60 dark:border-gray-700/40">
      <SkeletonBase className="h-10 w-28 rounded-xl" />
      <SkeletonBase className="h-10 w-32 rounded-xl" />
    </div>
  </div>
);

// ============================================
// Form Field Skeleton
// ============================================
export const FormFieldSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-2', className)}>
    <SkeletonBase className="h-4 w-24 rounded-md" />
    <SkeletonBase className="h-11 w-full rounded-xl" />
  </div>
);

// ============================================
// Categories Skeleton
// ============================================
export const CategoriesSkeleton: FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-36 rounded-lg" />
        <SkeletonBase className="h-4 w-52 rounded-md" />
      </div>
      <SkeletonBase className="h-10 w-36 rounded-xl" />
    </div>

    {/* Categories Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <CategoryItemSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================
// Category Item Skeleton
// ============================================
export const CategoryItemSkeleton: FC = () => (
  <div
    className={cn(
      'p-4 rounded-xl',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
    )}
  >
    <div className="flex items-center gap-3">
      <SkeletonBase className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-24 rounded-md" />
        <SkeletonBase className="h-3 w-16 rounded-md" />
      </div>
      <SkeletonBase className="h-8 w-8 rounded-lg" />
    </div>
  </div>
);

// ============================================
// Profile Page Skeleton
// ============================================
export const ProfilePageSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Profile Header */}
    <div
      className={cn(
        'p-6 rounded-2xl',
        'bg-white/80 dark:bg-gray-800/50',
        'border border-gray-100/60 dark:border-gray-700/40',
      )}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <SkeletonBase className="h-24 w-24 rounded-full" />
        <div className="flex-1 text-center sm:text-right space-y-3">
          <SkeletonBase className="h-6 w-40 rounded-lg mx-auto sm:mx-0" />
          <SkeletonBase className="h-4 w-56 rounded-md mx-auto sm:mx-0" />
          <div className="flex gap-4 justify-center sm:justify-start">
            <SkeletonBase className="h-8 w-20 rounded-lg" />
            <SkeletonBase className="h-8 w-20 rounded-lg" />
            <SkeletonBase className="h-8 w-20 rounded-lg" />
          </div>
        </div>
        <SkeletonBase className="h-10 w-32 rounded-xl" />
      </div>
    </div>

    {/* Profile Form */}
    <SettingsCardSkeleton />
  </div>
);

// ============================================
// Exchange Rates Skeleton
// ============================================
export const ExchangeRatesSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-40 rounded-lg" />
        <SkeletonBase className="h-4 w-56 rounded-md" />
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="h-10 w-32 rounded-xl" />
        <SkeletonBase className="h-10 w-32 rounded-xl" />
      </div>
    </div>

    {/* Rates Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <RateCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================
// Rate Card Skeleton
// ============================================
export const RateCardSkeleton: FC = () => (
  <div
    className={cn(
      'p-5 rounded-2xl',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
    )}
  >
    <div className="flex items-center gap-4 mb-4">
      <SkeletonBase className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-20 rounded-md" />
        <SkeletonBase className="h-3 w-16 rounded-md" />
      </div>
    </div>
    <div className="space-y-3">
      <div className="flex justify-between">
        <SkeletonBase className="h-3 w-12 rounded-md" />
        <SkeletonBase className="h-5 w-24 rounded-md" />
      </div>
      <div className="flex justify-between">
        <SkeletonBase className="h-3 w-16 rounded-md" />
        <SkeletonBase className="h-4 w-16 rounded-md" />
      </div>
    </div>
  </div>
);

// ============================================
// Advertisements Skeleton
// ============================================
export const AdvertisementsSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-36 rounded-lg" />
        <SkeletonBase className="h-4 w-52 rounded-md" />
      </div>
      <SkeletonBase className="h-10 w-36 rounded-xl" />
    </div>

    {/* Ads Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <AdCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================
// Ad Card Skeleton
// ============================================
export const AdCardSkeleton: FC = () => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
    )}
  >
    <SkeletonBase className="h-40 w-full rounded-none" />
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-4 w-28 rounded-md" />
        <SkeletonBase className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonBase className="h-3 w-full rounded-md" />
      <div className="flex gap-2 pt-2">
        <SkeletonBase className="h-8 w-20 rounded-lg" />
        <SkeletonBase className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  </div>
);

// ============================================
// Reports/Logs Skeleton
// ============================================
export const ReportsSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-32 rounded-lg" />
        <SkeletonBase className="h-4 w-48 rounded-md" />
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="h-10 w-36 rounded-xl" />
        <SkeletonBase className="h-10 w-28 rounded-xl" />
      </div>
    </div>

    {/* Tabs */}
    <div className="flex gap-2">
      {[...Array(3)].map((_, i) => (
        <SkeletonBase key={i} className="h-10 w-28 rounded-xl" />
      ))}
    </div>

    {/* Logs List */}
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/80 dark:bg-gray-800/50',
        'border border-gray-100/60 dark:border-gray-700/40',
      )}
    >
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="px-5 py-4 flex items-center gap-4 border-b border-gray-100/60 dark:border-gray-700/40 last:border-0"
        >
          <SkeletonBase className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-4 w-3/4 rounded-md" />
            <SkeletonBase className="h-3 w-1/2 rounded-md" />
          </div>
          <SkeletonBase className="h-3 w-20 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Inline Skeleton Components
// ============================================
export const TextSkeleton: FC<{ width?: string; className?: string }> = ({
  width = 'w-24',
  className,
}) => <SkeletonBase className={cn('h-4 rounded-md', width, className)} />;

export const AvatarSkeleton: FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
  return <SkeletonBase className={cn('rounded-full', sizes[size], className)} />;
};

export const ButtonSkeleton: FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizes = { sm: 'h-8 w-20', md: 'h-10 w-28', lg: 'h-12 w-36' };
  return <SkeletonBase className={cn('rounded-xl', sizes[size], className)} />;
};

export const BadgeSkeleton: FC<{ className?: string }> = ({ className }) => (
  <SkeletonBase className={cn('h-6 w-16 rounded-full', className)} />
);

export const InputSkeleton: FC<{ className?: string }> = ({ className }) => (
  <SkeletonBase className={cn('h-11 w-full rounded-xl', className)} />
);

// ============================================
// List Item Skeleton
// ============================================
export const ListItemSkeleton: FC<{ showAvatar?: boolean; showBadge?: boolean }> = ({
  showAvatar = true,
  showBadge = false,
}) => (
  <div className="flex items-center gap-4 p-4">
    {showAvatar && <AvatarSkeleton />}
    <div className="flex-1 space-y-2">
      <TextSkeleton width="w-32" />
      <TextSkeleton width="w-48" className="h-3" />
    </div>
    {showBadge && <BadgeSkeleton />}
  </div>
);

// ============================================
// Grid Skeleton
// ============================================
interface GridSkeletonProps {
  cols?: 1 | 2 | 3 | 4;
  count?: number;
  children?: ReactNode;
  itemClassName?: string;
}

export const GridSkeleton: FC<GridSkeletonProps> = ({
  cols = 3,
  count = 6,
  children,
  itemClassName,
}) => {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', colsClass[cols])}>
      {children ||
        [...Array(count)].map((_, i) => (
          <SkeletonBase key={i} className={cn('h-48 rounded-2xl', itemClassName)} />
        ))}
    </div>
  );
};

// ============================================
// Site Skeletons (Public Pages)
// ============================================

// ============================================
// Home Page Skeleton
// ============================================
export const HomePageSkeleton: FC = () => (
  <div className="nc-HomePage relative">
    {/* Exchange Rates Skeleton */}
    <div className="container relative">
      <ExchangeRatesBarSkeleton />
    </div>

    {/* Featured Slider Skeleton */}
    <div className="container relative mt-4">
      <HomeFeaturedSliderSkeleton />
    </div>

    {/* Categories Section Skeleton */}
    <div className="container relative mt-8 lg:mt-12">
      <SectionCategoriesSkeleton />
    </div>

    {/* Latest Posts Section Skeleton (Magazine1) */}
    <div className="container relative mt-10 lg:mt-14">
      <SectionMagazine1Skeleton />
    </div>

    {/* Ad Skeleton */}
    <div className="container relative mt-10 lg:mt-14">
      <AdBannerSkeleton />
    </div>

    {/* Gallery Posts Section Skeleton (Magazine7) */}
    <div className="container relative mt-10 lg:mt-14">
      <SectionMagazine7Skeleton />
    </div>

    {/* Second Ad Skeleton */}
    <div className="container relative mt-10 lg:mt-14">
      <AdBannerSkeleton />
    </div>

    {/* Top Authors Section Skeleton */}
    <div className="container relative mt-10 lg:mt-14">
      <SectionAuthorsSkeleton />
    </div>

    {/* Newsletter Section Skeleton */}
    <div className="container relative mt-12 lg:mt-20 mb-10 lg:mb-16">
      <NewsletterSkeleton />
    </div>
  </div>
);

// ============================================
// Exchange Rates Bar Skeleton (Homepage)
// ============================================
export const ExchangeRatesBarSkeleton: FC = () => (
  <div
    className={cn(
      'flex items-center gap-4 p-4 rounded-2xl overflow-hidden',
      'bg-white/80 dark:bg-neutral-800/50',
      'border border-neutral-100/60 dark:border-neutral-700/40',
    )}
  >
    <SkeletonBase className="h-5 w-24 rounded-md flex-shrink-0" />
    <div className="flex gap-6 overflow-hidden flex-1">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-shrink-0">
          <SkeletonBase className="h-6 w-6 rounded-full" />
          <SkeletonBase className="h-4 w-16 rounded-md" />
          <SkeletonBase className="h-4 w-20 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Home Featured Slider Skeleton
// ============================================
export const HomeFeaturedSliderSkeleton: FC = () => (
  <div className="relative rounded-3xl overflow-hidden gradient-neutral-br dark:from-neutral-900 dark:to-neutral-800 p-1.5 sm:p-2">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4">
      {/* Main Card */}
      <div className="lg:col-span-8">
        <div className="relative h-[320px] sm:h-[400px] lg:h-[480px] rounded-2xl overflow-hidden">
          <SkeletonBase className="absolute inset-0 rounded-none" />
          <div className="absolute top-4 sm:top-6 start-4 sm:start-6 z-10">
            <SkeletonBase className="h-9 w-24 rounded-full" />
          </div>
          <div className="absolute bottom-0 start-0 end-0 p-4 sm:p-6 lg:p-8 z-10 bg-gradient-to-t from-black/60 to-transparent">
            <SkeletonBase className="h-6 w-20 rounded-lg mb-3" />
            <SkeletonBase className="h-8 w-full mb-2" />
            <SkeletonBase className="h-8 w-3/4 mb-4" />
            <div className="flex items-center gap-3">
              <SkeletonBase className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <SkeletonBase className="h-4 w-24" />
                <SkeletonBase className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 sm:bottom-6 end-4 sm:end-6 flex items-center gap-2 z-10">
            <SkeletonBase className="h-2 w-8 rounded-full" />
            <SkeletonBase className="h-2 w-2 rounded-full" />
            <SkeletonBase className="h-2 w-2 rounded-full" />
          </div>
        </div>
      </div>
      {/* Side Cards */}
      <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2 sm:gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="relative flex-1 h-[160px] sm:h-[180px] lg:h-auto rounded-2xl overflow-hidden"
          >
            <SkeletonBase className="absolute inset-0 rounded-none" />
            <div className="absolute bottom-0 start-0 end-0 p-3 sm:p-4 z-10 bg-gradient-to-t from-black/60 to-transparent">
              <SkeletonBase className="h-4 w-16 rounded-md mb-2" />
              <SkeletonBase className="h-5 w-full mb-1" />
              <SkeletonBase className="h-5 w-3/4 mb-2" />
              <div className="flex items-center gap-2">
                <SkeletonBase className="h-5 w-5 rounded-full" />
                <SkeletonBase className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// Section Categories Skeleton (Homepage)
// ============================================
export const SectionCategoriesSkeleton: FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-40 rounded-lg" />
        <SkeletonBase className="h-4 w-28 rounded-md" />
      </div>
      <div className="flex gap-2">
        <SkeletonBase className="h-10 w-10 rounded-full" />
        <SkeletonBase className="h-10 w-10 rounded-full" />
      </div>
    </div>
    <div className="flex gap-4 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[140px] sm:w-[180px]">
          <SkeletonBase className="h-[140px] sm:h-[180px] w-full rounded-2xl" />
          <div className="mt-3 space-y-2">
            <SkeletonBase className="h-4 w-3/4 rounded-md mx-auto" />
            <SkeletonBase className="h-3 w-1/2 rounded-md mx-auto" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Section Magazine1 Skeleton (Latest Posts)
// ============================================
export const SectionMagazine1Skeleton: FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <SkeletonBase className="h-7 w-36 rounded-lg" />
      <SkeletonBase className="h-8 w-24 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Big Card */}
      <div
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-white dark:bg-neutral-800/90',
          'border border-neutral-200/80 dark:border-neutral-700/80',
        )}
      >
        <SkeletonBase className="aspect-[16/10] w-full rounded-none" />
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <SkeletonBase className="h-6 w-16 rounded-full" />
            <SkeletonBase className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <SkeletonBase className="h-6 w-full rounded-md" />
            <SkeletonBase className="h-6 w-3/4 rounded-md" />
          </div>
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-full rounded-md" />
            <SkeletonBase className="h-4 w-5/6 rounded-md" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <SkeletonBase className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <SkeletonBase className="h-4 w-24 rounded-md" />
              <SkeletonBase className="h-3 w-16 rounded-md" />
            </div>
          </div>
        </div>
      </div>
      {/* Small Cards */}
      <div className="flex flex-col gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-4 p-3 rounded-xl',
              'bg-white dark:bg-neutral-800/90',
              'border border-neutral-200/80 dark:border-neutral-700/80',
            )}
          >
            <SkeletonBase className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <SkeletonBase className="h-5 w-16 rounded-full" />
              <SkeletonBase className="h-5 w-full rounded-md" />
              <SkeletonBase className="h-5 w-3/4 rounded-md" />
              <div className="flex items-center gap-2 pt-1">
                <SkeletonBase className="h-6 w-6 rounded-full" />
                <SkeletonBase className="h-3 w-20 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// Section Magazine7 Skeleton (Gallery Posts)
// ============================================
export const SectionMagazine7Skeleton: FC = () => (
  <div className="space-y-6">
    <SkeletonBase className="h-7 w-40 rounded-lg" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-2xl overflow-hidden',
            'bg-white dark:bg-neutral-800/90',
            'border border-neutral-200/80 dark:border-neutral-700/80',
          )}
        >
          <SkeletonBase className="aspect-[4/3] w-full rounded-none" />
          <div className="p-4 space-y-3">
            <SkeletonBase className="h-5 w-full rounded-md" />
            <SkeletonBase className="h-5 w-2/3 rounded-md" />
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <SkeletonBase className="h-8 w-8 rounded-full" />
                <SkeletonBase className="h-3 w-20 rounded-md" />
              </div>
              <SkeletonBase className="h-3 w-16 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Section Authors Skeleton (Top Authors)
// ============================================
export const SectionAuthorsSkeleton: FC = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <SkeletonBase className="h-7 w-36 rounded-lg" />
      <SkeletonBase className="h-4 w-56 rounded-md" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex flex-col items-center p-4 sm:p-6 rounded-2xl',
            'bg-white dark:bg-neutral-800/90',
            'border border-neutral-200/80 dark:border-neutral-700/80',
          )}
        >
          <SkeletonBase className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
          <div className="mt-4 space-y-2 text-center w-full">
            <SkeletonBase className="h-5 w-3/4 rounded-md mx-auto" />
            <SkeletonBase className="h-3 w-1/2 rounded-md mx-auto" />
          </div>
          <SkeletonBase className="h-8 w-full rounded-full mt-4" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Ad Banner Skeleton
// ============================================
export const AdBannerSkeleton: FC = () => (
  <div className={cn('relative rounded-2xl overflow-hidden', 'bg-neutral-100 dark:bg-neutral-800')}>
    <SkeletonBase className="h-[120px] sm:h-[150px] lg:h-[180px] w-full rounded-none" />
  </div>
);

// ============================================
// Newsletter Skeleton
// ============================================
export const NewsletterSkeleton: FC = () => (
  <div
    className={cn(
      'relative rounded-3xl overflow-hidden p-8 sm:p-12',
      'bg-gradient-to-br from-primary-50 to-secondary-50',
      'dark:from-neutral-800 dark:to-neutral-900',
    )}
  >
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <SkeletonBase className="h-12 w-12 rounded-full mx-auto" />
      <SkeletonBase className="h-8 w-64 rounded-xl mx-auto" />
      <SkeletonBase className="h-5 w-80 rounded-lg mx-auto" />
      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
        <SkeletonBase className="h-12 flex-1 rounded-xl" />
        <SkeletonBase className="h-12 w-32 rounded-xl" />
      </div>
    </div>
  </div>
);

// ============================================
// Archive Page Skeleton
// ============================================
export const ArchivePageSkeleton: FC<{ cols?: number }> = ({ cols = 4 }) => (
  <div className="nc-PageArchive max-w-full overflow-x-hidden">
    {/* Premium Breadcrumb Skeleton */}
    <div className="sticky top-0 z-20 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50">
      <div className="container">
        <div className="flex py-3 gap-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonBase key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>

    {/* Premium Hero Section Skeleton */}
    <div className="container mt-6 mb-8">
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl p-6 md:p-10',
          'bg-gradient-to-br from-white via-neutral-50 to-primary-50/30',
          'dark:from-neutral-900 dark:via-neutral-800 dark:to-primary-900/20',
          'shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]',
          'border border-neutral-200/60 dark:border-neutral-700/60',
        )}
      >
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          {/* Image Skeleton */}
          <div className="relative">
            <SkeletonBase className="w-32 h-32 md:w-40 md:h-40 rounded-2xl" />
            <SkeletonBase className="absolute -bottom-2 -right-2 h-8 w-20 rounded-full" />
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 text-center md:text-right space-y-4">
            <SkeletonBase className="h-6 w-24 rounded-full mx-auto md:mx-0" />
            <SkeletonBase className="h-10 w-64 rounded-xl mx-auto md:mx-0" />
            <SkeletonBase className="h-5 w-80 rounded-lg mx-auto md:mx-0" />

            {/* Stats Pills Skeleton */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2.5 rounded-xl',
                    'bg-white dark:bg-neutral-800',
                    'border border-neutral-200/80 dark:border-neutral-700/80',
                  )}
                >
                  <SkeletonBase className="w-9 h-9 rounded-lg" />
                  <div className="space-y-1">
                    <SkeletonBase className="h-5 w-12 rounded-md" />
                    <SkeletonBase className="h-3 w-10 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Premium Filter Bar Skeleton */}
    <div className="container mb-8">
      <div
        className={cn(
          'hidden md:flex items-center justify-between p-4 rounded-2xl',
          'bg-white dark:bg-neutral-800/80',
          'shadow-sm border border-neutral-200/60 dark:border-neutral-700/60',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-4 border-l border-neutral-200 dark:border-neutral-700">
            <SkeletonBase className="w-5 h-5 rounded" />
            <SkeletonBase className="h-4 w-12 rounded-md" />
          </div>
          <div className="flex gap-2">
            <SkeletonBase className="h-10 w-28 rounded-xl" />
            <SkeletonBase className="h-10 w-24 rounded-xl" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBase className="h-4 w-16 rounded-md" />
          <SkeletonBase className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>

    {/* Posts Grid Skeleton */}
    <div className="container">
      <div
        className={cn(
          'grid gap-5 md:gap-6 lg:gap-7',
          cols === 2 && 'grid-cols-1 md:grid-cols-2',
          cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          cols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {[...Array(12)].map((_, i) => (
          <ArchivePostCardSkeleton key={i} />
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-center gap-2 mt-12 mb-8">
        {[...Array(5)].map((_, i) => (
          <SkeletonBase key={i} className="h-10 w-10 rounded-lg" />
        ))}
      </div>
    </div>

    {/* Categories Section Skeleton */}
    <div className="relative py-12 sm:py-16">
      <div className="container">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-7 w-40 rounded-lg" />
            <SkeletonBase className="h-8 w-24 rounded-lg" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <SkeletonBase key={i} className="h-32 w-32 rounded-2xl flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Authors Section Skeleton */}
    <div className="container py-12 sm:py-16">
      <div className="space-y-6">
        <div className="space-y-2">
          <SkeletonBase className="h-7 w-32 rounded-lg" />
          <SkeletonBase className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex gap-6 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3 flex-shrink-0">
              <SkeletonBase className="h-20 w-20 rounded-full" />
              <SkeletonBase className="h-4 w-24 rounded-md" />
              <SkeletonBase className="h-3 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Archive Post Card Skeleton (matches new Card11 design)
// ============================================
export const ArchivePostCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden',
      'bg-white dark:bg-neutral-800/90',
      'shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
      'border border-neutral-200/80 dark:border-neutral-700/80',
      className,
    )}
  >
    {/* Image */}
    <SkeletonBase className="aspect-[4/3] w-full rounded-none" />

    {/* Content */}
    <div className="p-5 space-y-3">
      {/* Meta */}
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonBase className="h-3 w-20 rounded-md" />
          <SkeletonBase className="h-2.5 w-16 rounded-md" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <SkeletonBase className="h-5 w-full rounded-md" />
        <SkeletonBase className="h-5 w-3/4 rounded-md" />
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <SkeletonBase className="h-3.5 w-full rounded-md" />
        <SkeletonBase className="h-3.5 w-5/6 rounded-md" />
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50">
        <SkeletonBase className="h-4 w-20 rounded-md" />
      </div>
    </div>
  </div>
);

// ============================================
// Single Post Skeleton
// ============================================
export const SinglePostSkeleton: FC = () => (
  <div className="container py-8">
    <article className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header className="space-y-6">
        {/* Categories */}
        <div className="flex gap-2">
          <SkeletonBase className="h-7 w-20 rounded-full" />
          <SkeletonBase className="h-7 w-24 rounded-full" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <SkeletonBase className="h-10 w-full rounded-xl" />
          <SkeletonBase className="h-10 w-3/4 rounded-xl" />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4">
          <SkeletonBase className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-32 rounded-md" />
            <SkeletonBase className="h-3 w-24 rounded-md" />
          </div>
        </div>
      </header>

      {/* Featured Image */}
      <SkeletonBase className="h-[400px] w-full rounded-2xl" />

      {/* Content */}
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <SkeletonBase
            key={i}
            className={cn(
              'h-4 rounded-md',
              i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-11/12' : 'w-4/5',
            )}
          />
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 pt-4">
        {[...Array(5)].map((_, i) => (
          <SkeletonBase key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Author Box */}
      <div
        className={cn(
          'p-6 rounded-2xl',
          'bg-white/80 dark:bg-gray-800/50',
          'border border-gray-100/60 dark:border-gray-700/40',
        )}
      >
        <div className="flex items-center gap-4">
          <SkeletonBase className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-5 w-32 rounded-md" />
            <SkeletonBase className="h-4 w-full rounded-md" />
            <SkeletonBase className="h-4 w-3/4 rounded-md" />
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-6 pt-8">
        <SkeletonBase className="h-6 w-32 rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <CommentSkeleton key={i} />
        ))}
      </div>
    </article>
  </div>
);

// ============================================
// Comment Skeleton
// ============================================
export const CommentSkeleton: FC = () => (
  <div
    className={cn(
      'p-4 rounded-xl',
      'bg-white/60 dark:bg-gray-800/40',
      'border border-gray-100/40 dark:border-gray-700/30',
    )}
  >
    <div className="flex gap-3">
      <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-4 w-24 rounded-md" />
          <SkeletonBase className="h-3 w-16 rounded-md" />
        </div>
        <div className="space-y-2">
          <SkeletonBase className="h-3 w-full rounded-md" />
          <SkeletonBase className="h-3 w-5/6 rounded-md" />
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Author Page Skeleton
// ============================================
export const AuthorPageSkeleton: FC = () => (
  <div className="container py-8 space-y-8">
    {/* Author Header */}
    <div
      className={cn(
        'p-8 rounded-3xl',
        'bg-gradient-to-br from-white/90 to-gray-50/90',
        'dark:from-gray-800/90 dark:to-gray-900/90',
        'border border-gray-100/60 dark:border-gray-700/40',
      )}
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        <SkeletonBase className="h-28 w-28 rounded-full" />
        <div className="flex-1 text-center md:text-right space-y-4">
          <SkeletonBase className="h-8 w-48 rounded-lg mx-auto md:mx-0" />
          <SkeletonBase className="h-4 w-64 rounded-md mx-auto md:mx-0" />
          <div className="flex gap-6 justify-center md:justify-start">
            <div className="text-center">
              <SkeletonBase className="h-6 w-12 rounded-md mx-auto" />
              <SkeletonBase className="h-3 w-16 rounded-md mt-1" />
            </div>
            <div className="text-center">
              <SkeletonBase className="h-6 w-12 rounded-md mx-auto" />
              <SkeletonBase className="h-3 w-16 rounded-md mt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Author Posts */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ============================================
// Contact Page Skeleton
// ============================================
export const ContactPageSkeleton: FC = () => (
  <div className="container py-12 max-w-4xl mx-auto space-y-8">
    <div className="text-center space-y-4">
      <SkeletonBase className="h-10 w-48 rounded-xl mx-auto" />
      <SkeletonBase className="h-5 w-96 rounded-lg mx-auto" />
    </div>

    <div
      className={cn(
        'p-8 rounded-2xl',
        'bg-white/80 dark:bg-gray-800/50',
        'border border-gray-100/60 dark:border-gray-700/40',
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton className="md:col-span-2" />
        <div className="md:col-span-2 space-y-2">
          <SkeletonBase className="h-4 w-20 rounded-md" />
          <SkeletonBase className="h-32 w-full rounded-xl" />
        </div>
        <SkeletonBase className="h-12 w-full md:w-40 rounded-xl md:col-span-2" />
      </div>
    </div>
  </div>
);

// ============================================
// Money Transfer / Exchange Page Skeleton
// ============================================
export const MoneyTransferSkeleton: FC = () => (
  <div className="container py-8 space-y-8">
    {/* Header */}
    <div className="text-center space-y-4">
      <SkeletonBase className="h-10 w-64 rounded-xl mx-auto" />
      <SkeletonBase className="h-5 w-96 rounded-lg mx-auto" />
    </div>

    {/* View Toggle */}
    <div className="flex justify-center">
      <SkeletonBase className="h-12 w-48 rounded-xl" />
    </div>

    {/* Rates Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <RateCardSkeleton key={i} />
      ))}
    </div>

    {/* Info Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'p-6 rounded-2xl',
            'bg-white/80 dark:bg-gray-800/50',
            'border border-gray-100/60 dark:border-gray-700/40',
          )}
        >
          <SkeletonBase className="h-12 w-12 rounded-xl mb-4" />
          <SkeletonBase className="h-5 w-32 rounded-md mb-2" />
          <SkeletonBase className="h-4 w-full rounded-md" />
          <SkeletonBase className="h-4 w-3/4 rounded-md mt-2" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Signin/Signup Page Skeleton
// ============================================
export const AuthPageSkeleton: FC = () => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div
      className={cn(
        'w-full max-w-md p-8 rounded-2xl space-y-6',
        'bg-white/90 dark:bg-gray-800/90',
        'border border-gray-100/60 dark:border-gray-700/40',
        'shadow-xl',
      )}
    >
      {/* Logo */}
      <SkeletonBase className="h-12 w-32 rounded-lg mx-auto" />

      {/* Title */}
      <div className="text-center space-y-2">
        <SkeletonBase className="h-7 w-40 rounded-lg mx-auto" />
        <SkeletonBase className="h-4 w-56 rounded-md mx-auto" />
      </div>

      {/* Social Buttons */}
      <div className="flex gap-3">
        <SkeletonBase className="h-12 flex-1 rounded-xl" />
        <SkeletonBase className="h-12 flex-1 rounded-xl" />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <SkeletonBase className="h-px flex-1" />
        <SkeletonBase className="h-4 w-8 rounded" />
        <SkeletonBase className="h-px flex-1" />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>

      {/* Submit Button */}
      <SkeletonBase className="h-12 w-full rounded-xl" />

      {/* Footer Link */}
      <SkeletonBase className="h-4 w-48 rounded-md mx-auto" />
    </div>
  </div>
);

// ============================================
// Subscription Page Skeleton (Site)
// ============================================
export const SubscriptionPageSkeleton: FC = () => (
  <div className="container py-12 space-y-10">
    {/* Header */}
    <div className="text-center space-y-4">
      <SkeletonBase className="h-10 w-56 rounded-xl mx-auto" />
      <SkeletonBase className="h-5 w-80 rounded-lg mx-auto" />
    </div>

    {/* Plans */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'p-6 rounded-2xl space-y-6',
            'bg-white/80 dark:bg-gray-800/50',
            'border border-gray-100/60 dark:border-gray-700/40',
            i === 1 && 'ring-2 ring-primary-500/50 scale-105',
          )}
        >
          <SkeletonBase className="h-6 w-24 rounded-lg" />
          <SkeletonBase className="h-10 w-32 rounded-xl" />
          <div className="space-y-3">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <SkeletonBase className="h-5 w-5 rounded-full" />
                <SkeletonBase className="h-4 flex-1 rounded-md" />
              </div>
            ))}
          </div>
          <SkeletonBase className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Inline Loading Skeleton (for buttons, etc.)
// ============================================
export const InlineLoadingSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center gap-2', className)}>
    <div className="relative h-4 w-4">
      <div className="absolute inset-0 rounded-full border-2 border-current opacity-20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin" />
    </div>
  </div>
);

// ============================================
// Service Requests Page Skeleton
// ============================================
export const ServiceRequestsSkeleton: FC = () => (
  <div className="min-h-screen">
    {/* Ambient Background */}
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/8 to-indigo-500/5 rounded-full blur-3xl" />
    </div>

    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="relative">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <SkeletonBase className="p-3.5 h-14 w-14 rounded-2xl" />
              <div>
                <SkeletonBase className="h-8 w-48 rounded-lg" />
                <SkeletonBase className="h-4 w-64 rounded-md mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'relative p-5 rounded-2xl',
              'bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900',
              'border border-neutral-200/50 dark:border-neutral-700/50',
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <SkeletonBase className="h-10 w-10 rounded-xl" />
              <SkeletonBase className="h-4 w-16 rounded-md" />
            </div>
            <SkeletonBase className="h-8 w-12 rounded-lg" />
            <SkeletonBase className="h-3 w-20 rounded-md mt-2" />
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div
        className={cn(
          'rounded-3xl overflow-hidden',
          'bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900',
          'border border-neutral-200/50 dark:border-neutral-700/50',
        )}
      >
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-neutral-200/50 dark:border-neutral-700/50">
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-6 w-40 rounded-lg" />
            <div className="flex gap-3">
              <SkeletonBase className="h-10 w-32 rounded-xl" />
              <SkeletonBase className="h-10 w-48 rounded-xl" />
            </div>
          </div>
        </div>
        {/* Table Rows */}
        <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <SkeletonBase className="h-4 w-full rounded-md" />
                  <SkeletonBase className="h-3 w-2/3 rounded-md" />
                </div>
                <SkeletonBase className="h-6 w-20 rounded-full self-center" />
                <SkeletonBase className="h-4 w-24 rounded-md self-center" />
                <SkeletonBase className="h-4 w-20 rounded-md self-center" />
                <div className="flex gap-2 justify-end">
                  <SkeletonBase className="h-8 w-8 rounded-lg" />
                  <SkeletonBase className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Online Payment Page Skeleton
// ============================================
export const OnlinePaymentPageSkeleton: FC = () => (
  <main className="min-h-screen bg-white dark:bg-neutral-900">
    {/* Hero Skeleton */}
    <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          <div className="lg:w-1/2 text-center lg:text-right">
            <SkeletonBase className="h-8 w-32 rounded-full mx-auto lg:mx-0 mb-6" />
            <SkeletonBase className="h-14 w-full max-w-md rounded-lg mx-auto lg:mx-0 mb-4" />
            <SkeletonBase className="h-14 w-3/4 rounded-lg mx-auto lg:mx-0 mb-6" />
            <SkeletonBase className="h-6 w-full max-w-lg rounded mx-auto lg:mx-0 mb-2" />
            <SkeletonBase className="h-6 w-5/6 rounded mx-auto lg:mx-0 mb-8" />
            <div className="flex gap-4 justify-center lg:justify-start">
              <SkeletonBase className="h-14 w-36 rounded-xl" />
              <SkeletonBase className="h-14 w-36 rounded-xl" />
            </div>
          </div>
          <div className="lg:w-1/2">
            <SkeletonBase className="h-80 w-full max-w-lg rounded-2xl mx-auto" />
          </div>
        </div>
        <div className="mt-16 flex justify-center gap-8">
          {[...Array(4)].map((_, i) => (
            <SkeletonBase key={i} className="h-10 w-20 rounded" />
          ))}
        </div>
      </div>
    </section>

    {/* Services Skeleton */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SkeletonBase className="h-6 w-24 rounded-full mx-auto mb-4" />
          <SkeletonBase className="h-10 w-64 rounded-lg mx-auto mb-4" />
          <SkeletonBase className="h-5 w-96 rounded mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={cn('p-8 rounded-2xl', 'bg-neutral-100 dark:bg-neutral-800')}>
              <SkeletonBase className="h-14 w-14 rounded-xl mb-6" />
              <SkeletonBase className="h-6 w-32 rounded mb-3" />
              <SkeletonBase className="h-4 w-full rounded mb-2" />
              <SkeletonBase className="h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Contact Skeleton */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className={cn('p-12 rounded-3xl', 'bg-neutral-100 dark:bg-neutral-800')}>
          <SkeletonBase className="h-8 w-48 rounded-lg mx-auto mb-4" />
          <SkeletonBase className="h-5 w-72 rounded mx-auto mb-10" />
          <div className="flex justify-center gap-4">
            <SkeletonBase className="h-14 w-44 rounded-xl" />
            <SkeletonBase className="h-14 w-44 rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  </main>
);

// ============================================
// Card6 Skeleton (Horizontal Post Card)
// ============================================
export const Card6Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('nc-Card6Skeleton', className)}>
    {/* Mobile: Vertical Card with Overlay */}
    <div className="sm:hidden relative rounded-xl overflow-hidden">
      <SkeletonBase className="aspect-[16/10] w-full rounded-none" />
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        {/* Top: Categories */}
        <div className="flex items-start justify-between">
          <div className="flex gap-1.5">
            <SkeletonBase className="h-5 w-14 rounded-full" />
            <SkeletonBase className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonBase className="h-7 w-7 rounded-full" />
        </div>
        {/* Bottom: Title & Meta */}
        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <SkeletonBase className="h-4 w-full rounded-md" />
            <SkeletonBase className="h-4 w-3/4 rounded-md" />
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/20">
            <SkeletonBase className="h-6 w-6 rounded-full" />
            <SkeletonBase className="h-3 w-20 rounded-md" />
            <SkeletonBase className="h-3 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>

    {/* Desktop: Horizontal Card */}
    <div
      className={cn(
        'hidden sm:flex flex-row items-stretch p-4 rounded-2xl gap-4',
        'bg-white/90 dark:bg-neutral-900/90',
        'border border-neutral-100 dark:border-neutral-800',
      )}
    >
      {/* Image */}
      <SkeletonBase className="w-36 md:w-40 lg:w-44 aspect-[5/3] rounded-xl flex-shrink-0" />

      {/* Content */}
      <div className="flex flex-col flex-grow justify-between min-w-0 py-0.5">
        {/* Categories */}
        <div className="flex gap-1.5 mb-2">
          <SkeletonBase className="h-5 w-14 rounded-full" />
          <SkeletonBase className="h-5 w-18 rounded-full" />
        </div>

        {/* Title */}
        <div className="space-y-1.5 mb-auto">
          <SkeletonBase className="h-4 w-full rounded-md" />
          <SkeletonBase className="h-4 w-4/5 rounded-md" />
        </div>

        {/* Meta */}
        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <SkeletonBase className="h-6 w-6 rounded-full" />
            <SkeletonBase className="h-3 w-20 rounded-md" />
            <SkeletonBase className="h-3 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
