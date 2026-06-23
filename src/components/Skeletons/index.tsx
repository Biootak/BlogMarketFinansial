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
      className
    )}
  >
    {children}
  </div>
);

// ============================================
// Dashboard Page Skeleton (2026 redesign)
// Mirrors: hero → bento → donut+activity → analytics → posts.
// ============================================
export const DashboardPageSkeleton: FC = () => (
  <div
    dir="rtl"
    className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8"
    aria-busy="true"
    aria-label="در حال بارگذاری داشبورد"
  >
    {/* Hero strip */}
    <div className="rounded-3xl p-6 sm:p-8 lg:p-10 bg-slate-900/80 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-3 mb-5">
        <SkeletonBase className="h-6 w-44 rounded-full" />
        <SkeletonBase className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 space-y-4">
          <SkeletonBase className="h-9 sm:h-11 w-2/3 rounded-xl" />
          <SkeletonBase className="h-4 w-3/4 rounded-md" />
          <div className="flex flex-wrap gap-2.5">
            <SkeletonBase className="h-10 w-44 rounded-xl" />
            <SkeletonBase className="h-10 w-28 rounded-xl" />
            <SkeletonBase className="h-10 w-28 rounded-xl" />
            <SkeletonBase className="h-10 w-28 rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-4 flex justify-start lg:justify-end">
          <SkeletonBase className="h-16 w-44 rounded-2xl" />
        </div>
      </div>
    </div>

    {/* Bento KPIs */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
      <SkeletonBase className="sm:col-span-2 lg:col-span-5 h-[228px] rounded-3xl" />
      <SkeletonBase className="lg:col-span-3 lg:col-start-6 h-[228px] rounded-3xl" />
      <SkeletonBase className="lg:col-span-4 lg:col-start-9 h-[228px] rounded-3xl" />
      <SkeletonBase className="lg:col-span-4 lg:col-start-1 h-[228px] rounded-3xl" />
      <SkeletonBase className="lg:col-span-4 lg:col-start-5 h-[228px] rounded-3xl" />
      <SkeletonBase className="lg:col-span-4 lg:col-start-9 h-[228px] rounded-3xl" />
    </div>

    {/* Donut + Activity row */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
      <div className="dash-panel overflow-hidden lg:col-span-5">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <SkeletonBase className="h-4 w-32 rounded-md" />
          <SkeletonBase className="h-3 w-44 rounded-md mt-2" />
        </div>
        <div className="p-5 sm:p-6 flex items-center gap-6">
          <SkeletonBase className="h-44 w-44 rounded-full" />
          <div className="flex-1 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <SkeletonBase className="h-3 w-24 rounded-md" />
                <SkeletonBase className="h-3 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="dash-panel overflow-hidden lg:col-span-7">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBase className="h-10 w-10 rounded-xl" />
            <SkeletonBase className="h-4 w-32 rounded-md" />
          </div>
          <SkeletonBase className="h-4 w-12 rounded-md" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <SkeletonBase className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBase className="h-3.5 w-3/4 rounded-md" />
                <SkeletonBase className="h-3 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Analytics panel placeholder */}
    <div className="dash-panel overflow-hidden">
      <div className="px-5 sm:px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SkeletonBase className="h-11 w-11 rounded-xl" />
          <div className="space-y-2">
            <SkeletonBase className="h-5 w-32 rounded-md" />
            <SkeletonBase className="h-3 w-56 rounded-md" />
          </div>
        </div>
        <SkeletonBase className="h-8 w-32 rounded-xl" />
      </div>
      <div className="p-5 sm:p-7">
        <SkeletonBase className="h-10 w-56 rounded-xl mb-4" />
        <SkeletonBase className="h-[320px] sm:h-[380px] w-full rounded-xl" />
      </div>
    </div>

    {/* Posts lists — 2 columns */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      <div className="dash-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBase className="h-10 w-10 rounded-xl" />
            <SkeletonBase className="h-4 w-28 rounded-md" />
          </div>
          <SkeletonBase className="h-4 w-16 rounded-md" />
        </div>
        <div className="p-3 space-y-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl">
              <div className="flex-1 space-y-2">
                <SkeletonBase className="h-3.5 w-3/4 rounded-md" />
                <SkeletonBase className="h-3 w-1/2 rounded-md" />
              </div>
              <SkeletonBase className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="dash-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBase className="h-10 w-10 rounded-xl" />
            <SkeletonBase className="h-4 w-32 rounded-md" />
          </div>
          <SkeletonBase className="h-4 w-16 rounded-md" />
        </div>
        <div className="p-3 space-y-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl">
              <div className="flex-1 space-y-2">
                <SkeletonBase className="h-3.5 w-3/4 rounded-md" />
                <SkeletonBase className="h-3 w-1/2 rounded-md" />
              </div>
              <SkeletonBase className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
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
      className
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
      className
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
      className
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
          <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <SkeletonBase className="h-4 w-full rounded-md" />
              <SkeletonBase className="h-3 w-2/3 rounded-md" />
            </div>
            <SkeletonBase className="h-6 w-20 rounded-full self-center" />
            <SkeletonBase className="h-4 w-24 rounded-md self-center" />
          </div>
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
// Settings / Profile / Report skeletons — preserved
// ============================================
export const UsersTableSkeleton: FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
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
    <TableSkeleton rows={rows} />
  </div>
);

export const PostsListSkeleton: FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(rows)].map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const PostCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40',
      className
    )}
  >
    <SkeletonBase className="h-48 w-full rounded-none" />
    <div className="p-5 space-y-4">
      <div className="flex gap-2">
        <SkeletonBase className="h-6 w-16 rounded-full" />
        <SkeletonBase className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonBase className="h-5 w-full rounded-md" />
        <SkeletonBase className="h-5 w-3/4 rounded-md" />
      </div>
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-full rounded-md" />
        <SkeletonBase className="h-3 w-5/6 rounded-md" />
      </div>
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

export const SettingsPageSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    <div className="space-y-2">
      <SkeletonBase className="h-8 w-36 rounded-lg" />
      <SkeletonBase className="h-4 w-64 rounded-md" />
    </div>
    <div className="flex gap-2 border-b border-gray-200/60 dark:border-gray-700/40 pb-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonBase key={i} className="h-10 w-28 rounded-xl" />
      ))}
    </div>
    <SettingsCardSkeleton />
  </div>
);

export const SettingsCardSkeleton: FC = () => (
  <div
    className={cn(
      'p-6 rounded-2xl space-y-6',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40'
    )}
  >
    <div className="space-y-2 pb-4 border-b border-gray-100/60 dark:border-gray-700/40">
      <SkeletonBase className="h-5 w-40 rounded-md" />
      <SkeletonBase className="h-3 w-64 rounded-md" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
    </div>
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100/60 dark:border-gray-700/40">
      <SkeletonBase className="h-10 w-28 rounded-xl" />
      <SkeletonBase className="h-10 w-32 rounded-xl" />
    </div>
  </div>
);

export const FormFieldSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-2', className)}>
    <SkeletonBase className="h-4 w-24 rounded-md" />
    <SkeletonBase className="h-11 w-full rounded-xl" />
  </div>
);

export const CategoriesSkeleton: FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-36 rounded-lg" />
        <SkeletonBase className="h-4 w-52 rounded-md" />
      </div>
      <SkeletonBase className="h-10 w-36 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <CategoryItemSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const CategoryItemSkeleton: FC = () => (
  <div
    className={cn(
      'p-4 rounded-xl',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40'
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

export const ProfilePageSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    <div
      className={cn(
        'p-6 rounded-2xl',
        'bg-white/80 dark:bg-gray-800/50',
        'border border-gray-100/60 dark:border-gray-700/40'
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
    <SettingsCardSkeleton />
  </div>
);

export const ExchangeRatesSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <RateCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const RateCardSkeleton: FC = () => (
  <div
    className={cn(
      'p-5 rounded-2xl',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40'
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

export const AdvertisementsSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBase className="h-7 w-36 rounded-lg" />
        <SkeletonBase className="h-4 w-52 rounded-md" />
      </div>
      <SkeletonBase className="h-10 w-36 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <AdCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const AdCardSkeleton: FC = () => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden',
      'bg-white/80 dark:bg-gray-800/50',
      'border border-gray-100/60 dark:border-gray-700/40'
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

export const ReportsSkeleton: FC = () => (
  <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
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
    <div className="flex gap-2">
      {[...Array(3)].map((_, i) => (
        <SkeletonBase key={i} className="h-10 w-28 rounded-xl" />
      ))}
    </div>
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/80 dark:bg-gray-800/50',
        'border border-gray-100/60 dark:border-gray-700/40'
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

export const InlineLoadingSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center gap-2', className)}>
    <div className="relative h-4 w-4">
      <div className="absolute inset-0 rounded-full border-2 border-current opacity-20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin" />
    </div>
  </div>
);

export const ServiceRequestsSkeleton: FC = () => (
  <div className="min-h-screen">
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-slate-200/30 dark:bg-slate-800/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/30 dark:bg-slate-800/20 rounded-full blur-3xl" />
    </div>
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <SkeletonBase className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <SkeletonBase className="h-8 w-48 rounded-lg" />
              <SkeletonBase className="h-4 w-64 rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white/80 dark:bg-gray-800/50 border border-gray-100/60 dark:border-gray-700/40"
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
      <div className="rounded-2xl overflow-hidden bg-white/80 dark:bg-gray-800/50 border border-gray-100/60 dark:border-gray-700/40">
        <div className="px-6 py-4 border-b border-gray-100/60 dark:border-gray-700/40">
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-6 w-40 rounded-lg" />
            <div className="flex gap-3">
              <SkeletonBase className="h-10 w-32 rounded-xl" />
              <SkeletonBase className="h-10 w-48 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100/60 dark:divide-gray-700/40">
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

export const OnlinePaymentPageSkeleton: FC = () => (
  <main className="min-h-screen bg-white dark:bg-neutral-900">
    <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          <div className="lg:w-1/2 text-center lg:text-right space-y-4">
            <SkeletonBase className="h-8 w-32 rounded-full mx-auto lg:mx-0" />
            <SkeletonBase className="h-14 w-full max-w-md rounded-lg mx-auto lg:mx-0" />
            <SkeletonBase className="h-14 w-3/4 rounded-lg mx-auto lg:mx-0" />
            <SkeletonBase className="h-6 w-full max-w-lg rounded mx-auto lg:mx-0" />
            <SkeletonBase className="h-6 w-5/6 rounded mx-auto lg:mx-0" />
            <div className="flex gap-4 justify-center lg:justify-start pt-4">
              <SkeletonBase className="h-14 w-36 rounded-xl" />
              <SkeletonBase className="h-14 w-36 rounded-xl" />
            </div>
          </div>
          <div className="lg:w-1/2">
            <SkeletonBase className="h-80 w-full max-w-lg rounded-2xl mx-auto" />
          </div>
        </div>
      </div>
    </section>
  </main>
);

export const Card6Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-3xl overflow-hidden bg-white dark:bg-neutral-900',
      'border border-neutral-200/60 dark:border-neutral-800/60',
      className
    )}
  >
    <SkeletonBase className="aspect-[16/10] w-full rounded-none" />
    <div className="p-4 space-y-3">
      <SkeletonBase className="h-5 w-3/4 rounded-md" />
      <SkeletonBase className="h-5 w-2/3 rounded-md" />
      <div className="flex items-center justify-between pt-2">
        <SkeletonBase className="h-8 w-8 rounded-full" />
        <SkeletonBase className="h-3 w-16 rounded-md" />
      </div>
    </div>
  </div>
);

// ============================================
// Author / Archive / Single / Category skeletons — preserved
// ============================================
export const HomePageSkeleton: FC = () => (
  <div className="nc-HomePage relative">
    <div className="container relative">
      <ExchangeRatesBarSkeleton />
    </div>
    <div className="container relative mt-4">
      <HomeFeaturedSliderSkeleton />
    </div>
    <div className="container relative mt-8 lg:mt-12">
      <SectionCategoriesSkeleton />
    </div>
    <div className="container relative mt-10 lg:mt-14">
      <SectionMagazine1Skeleton />
    </div>
    <div className="container relative mt-10 lg:mt-14">
      <AdBannerSkeleton />
    </div>
    <div className="container relative mt-10 lg:mt-14">
      <SectionMagazine7Skeleton />
    </div>
    <div className="container relative mt-10 lg:mt-14">
      <AdBannerSkeleton />
    </div>
    <div className="container relative mt-10 lg:mt-14">
      <SectionAuthorsSkeleton />
    </div>
    <div className="container relative mt-12 lg:mt-20 mb-10 lg:mb-16">
      <NewsletterSkeleton />
    </div>
  </div>
);

export const ExchangeRatesBarSkeleton: FC = () => (
  <div
    className={cn(
      'flex items-center gap-4 p-4 rounded-2xl overflow-hidden',
      'bg-white/80 dark:bg-neutral-800/50',
      'border border-neutral-100/60 dark:border-neutral-700/40'
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

export const HomeFeaturedSliderSkeleton: FC = () => (
  <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-1.5 sm:p-2">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4">
      <div className="lg:col-span-8">
        <div className="relative h-[320px] sm:h-[400px] lg:h-[480px] rounded-2xl overflow-hidden">
          <SkeletonBase className="absolute inset-0 rounded-none" />
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
        </div>
      </div>
      <div className="lg:col-span-4 flex flex-row lg:flex-col gap-2 sm:gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="relative flex-1 h-[160px] sm:h-[180px] lg:h-auto rounded-2xl overflow-hidden">
            <SkeletonBase className="absolute inset-0 rounded-none" />
            <div className="absolute bottom-0 start-0 end-0 p-3 sm:p-4 z-10 bg-gradient-to-t from-black/60 to-transparent">
              <SkeletonBase className="h-4 w-16 rounded-md mb-2" />
              <SkeletonBase className="h-5 w-full mb-1" />
              <SkeletonBase className="h-5 w-3/4 mb-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

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

export const SectionMagazine1Skeleton: FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <SkeletonBase className="h-7 w-36 rounded-lg" />
      <SkeletonBase className="h-8 w-24 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-white dark:bg-neutral-800/90',
          'border border-neutral-200/80 dark:border-neutral-700/80'
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
          <div className="flex items-center gap-3 pt-2">
            <SkeletonBase className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <SkeletonBase className="h-4 w-24 rounded-md" />
              <SkeletonBase className="h-3 w-16 rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-4 p-3 rounded-xl',
              'bg-white dark:bg-neutral-800/90',
              'border border-neutral-200/80 dark:border-neutral-700/80'
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
            'border border-neutral-200/80 dark:border-neutral-700/80'
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
            'border border-neutral-200/80 dark:border-neutral-700/80'
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

export const AdBannerSkeleton: FC = () => (
  <div
    className={cn(
      'relative rounded-2xl overflow-hidden',
      'bg-neutral-100 dark:bg-neutral-800'
    )}
  >
    <SkeletonBase className="h-[120px] sm:h-[150px] lg:h-[180px] w-full rounded-none" />
  </div>
);

export const NewsletterSkeleton: FC = () => (
  <div
    className={cn(
      'relative rounded-3xl overflow-hidden p-8 sm:p-12',
      'bg-neutral-100 dark:bg-neutral-800'
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

export const ArchivePageSkeleton: FC<{ cols?: number }> = ({ cols = 4 }) => (
  <div className="nc-PageArchive max-w-full overflow-x-hidden">
    <div className="sticky top-0 z-20 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50">
      <div className="container">
        <div className="flex py-3 gap-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonBase key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
    <div className="container py-8">
      <div className="grid gap-5 md:gap-6 lg:gap-7 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(12)].map((_, i) => (
          <ArchivePostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const ArchivePostCardSkeleton: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-2xl overflow-hidden',
      'bg-white dark:bg-neutral-800/90',
      'border border-neutral-200/80 dark:border-neutral-700/80',
      className
    )}
  >
    <SkeletonBase className="aspect-[4/3] w-full rounded-none" />
    <div className="p-5 space-y-3">
      <SkeletonBase className="h-5 w-full rounded-md" />
      <SkeletonBase className="h-5 w-3/4 rounded-md" />
    </div>
  </div>
);

export const SinglePostSkeleton: FC = () => (
  <div className="container py-8">
    <article className="max-w-4xl mx-auto space-y-8">
      <SkeletonBase className="h-[400px] w-full rounded-2xl" />
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <SkeletonBase key={i} className="h-4 rounded-md w-full" />
        ))}
      </div>
    </article>
  </div>
);

export const CommentSkeleton: FC = () => (
  <div className="flex gap-3">
    <SkeletonBase className="h-10 w-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonBase className="h-3 w-full rounded-md" />
      <SkeletonBase className="h-3 w-5/6 rounded-md" />
    </div>
  </div>
);

export const AuthorPageSkeleton: FC = () => (
  <div className="container py-8 space-y-8">
    <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col md:flex-row items-center gap-6">
      <SkeletonBase className="h-28 w-28 rounded-full" />
      <div className="flex-1 space-y-3">
        <SkeletonBase className="h-8 w-48 rounded-lg" />
        <SkeletonBase className="h-4 w-64 rounded-md" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const ContactPageSkeleton: FC = () => (
  <div className="container py-12 max-w-4xl mx-auto space-y-8">
    <div className="text-center space-y-4">
      <SkeletonBase className="h-10 w-48 rounded-xl mx-auto" />
      <SkeletonBase className="h-5 w-96 rounded-lg mx-auto" />
    </div>
    <div className="p-8 rounded-2xl bg-white/80 dark:bg-neutral-800/50 border border-neutral-100/60 dark:border-neutral-700/40 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
      <SkeletonBase className="h-12 w-full rounded-xl" />
    </div>
  </div>
);

export const MoneyTransferSkeleton: FC = () => (
  <div className="container py-8 space-y-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <RateCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const AuthPageSkeleton: FC = () => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="w-full max-w-md p-8 rounded-2xl space-y-6 bg-white/90 dark:bg-neutral-800/90 border border-neutral-100/60 dark:border-neutral-700/40 shadow-xl">
      <SkeletonBase className="h-12 w-32 rounded-lg mx-auto" />
      <div className="space-y-2">
        <SkeletonBase className="h-4 w-full rounded-md" />
        <SkeletonBase className="h-4 w-full rounded-md" />
      </div>
      <SkeletonBase className="h-12 w-full rounded-xl" />
    </div>
  </div>
);

export const SubscriptionPageSkeleton: FC = () => (
  <div className="container py-12 space-y-10">
    <div className="text-center space-y-4">
      <SkeletonBase className="h-10 w-56 rounded-xl mx-auto" />
      <SkeletonBase className="h-5 w-80 rounded-lg mx-auto" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-2xl space-y-6 bg-white/80 dark:bg-neutral-800/50 border border-neutral-100/60 dark:border-neutral-700/40"
        >
          <SkeletonBase className="h-6 w-24 rounded-lg" />
          <SkeletonBase className="h-10 w-32 rounded-xl" />
          <div className="space-y-3">
            {[...Array(5)].map((_, j) => (
              <SkeletonBase key={j} className="h-4 w-full rounded-md" />
            ))}
          </div>
          <SkeletonBase className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);
