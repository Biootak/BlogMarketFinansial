'use client';

import { cn } from '@/lib/utils';
import type { FC, ReactNode } from 'react';

// Base Skeleton with shimmer effect
interface SkeletonBaseProps {
  className?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export const SkeletonBase: FC<SkeletonBaseProps> = ({ className, children, style }) => (
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
    style={style}
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
  cols: _cols = 4,
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
      className,
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
      'border border-gray-100/60 dark:border-gray-700/40',
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

export const ProfilePageSkeleton: FC = () => (
  <div className="flex flex-col gap-5 animate-pulse">
    {/* Identity panel: cover + avatar overlap + meta */}
    <div
      className={cn(
        'rounded-[20px] border overflow-hidden',
        'bg-white dark:bg-neutral-900',
        'border-neutral-100 dark:border-neutral-800',
      )}
    >
      {/* Cover */}
      <SkeletonBase className="h-44 w-full rounded-none" />
      {/* Body: avatar overlapping cover + meta */}
      <div className="flex items-end gap-4 px-5 pb-5 -mt-11">
        {/* Avatar with ring */}
        <SkeletonBase className="h-24 w-24 rounded-[14px] border-[3px] border-white dark:border-neutral-900 flex-shrink-0" />
        {/* Meta */}
        <div className="flex-1 min-w-0 pt-10 space-y-2">
          <SkeletonBase className="h-5 w-36 rounded" />
          <SkeletonBase className="h-3.5 w-44 rounded" />
          <div className="flex items-center gap-3 pt-1">
            <SkeletonBase className="h-5 w-16 rounded-full" />
            <SkeletonBase className="h-3 w-24 rounded" />
            <SkeletonBase className="h-2 flex-1 max-w-[120px] rounded-full" />
          </div>
        </div>
      </div>
    </div>

    {/* Two-column layout: sidebar + content */}
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
      {/* Sidebar nav */}
      <div
        className={cn(
          'rounded-[14px] border p-2 space-y-0.5',
          'bg-white dark:bg-neutral-900',
          'border-neutral-100 dark:border-neutral-800',
        )}
      >
        {[...Array(3)].map((_, i) => (
          <SkeletonBase key={i} className="h-10 w-full rounded-[8px]" />
        ))}
      </div>

      {/* Content area */}
      <div className="space-y-4">
        {/* Card 1 — personal info */}
        <div
          className={cn(
            'rounded-[14px] border p-5 space-y-4',
            'bg-white dark:bg-neutral-900',
            'border-neutral-100 dark:border-neutral-800',
          )}
        >
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <SkeletonBase className="h-9 w-9 rounded-[6px]" />
            <div className="space-y-1.5">
              <SkeletonBase className="h-4 w-28 rounded" />
              <SkeletonBase className="h-3 w-40 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <FormFieldSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Card 2 — bio */}
        <div
          className={cn(
            'rounded-[14px] border p-5 space-y-4',
            'bg-white dark:bg-neutral-900',
            'border-neutral-100 dark:border-neutral-800',
          )}
        >
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <SkeletonBase className="h-9 w-9 rounded-[6px]" />
            <div className="space-y-1.5">
              <SkeletonBase className="h-4 w-24 rounded" />
              <SkeletonBase className="h-3 w-36 rounded" />
            </div>
          </div>
          <FormFieldSkeleton />
          <SkeletonBase className="h-[7rem] w-full rounded-xl" />
        </div>

        {/* Submit row */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <SkeletonBase className="h-5 w-32 rounded-full" />
          <SkeletonBase className="h-10 w-40 rounded-lg" />
        </div>
      </div>
    </div>
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
  <div
    dir="rtl"
    className="flex flex-col gap-5 max-w-[960px] py-6"
    aria-busy="true"
    aria-label="در حال بارگذاری درخواست‌ها"
  >
    {/* Header */}
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SkeletonBase className="h-9 w-9 rounded-xl" />
          <SkeletonBase className="h-8 w-44 rounded-lg" />
        </div>
        <SkeletonBase className="h-4 w-56 rounded-md ms-11" />
      </div>
      <SkeletonBase className="h-10 w-36 rounded-xl" />
    </div>

    {/* Pipeline Rail */}
    <div className="flex rounded-2xl overflow-hidden border border-gray-100/80 dark:border-gray-700/40">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 py-3 px-2">
          <SkeletonBase className="h-7 w-10 rounded-md" />
          <SkeletonBase className="h-3 w-14 rounded-sm" />
        </div>
      ))}
    </div>

    {/* Claim panel */}
    <SkeletonBase className="h-12 rounded-2xl" />

    {/* Cards */}
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100/80 dark:border-gray-700/40 bg-white/60 dark:bg-gray-800/40"
        style={{ paddingInlineStart: '1.25rem' }}
      >
        <SkeletonBase className="h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonBase className="h-4 w-40 rounded-md" />
          <SkeletonBase className="h-3 w-28 rounded-sm" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <SkeletonBase className="h-4 w-24 rounded-md" />
          <SkeletonBase className="h-5 w-20 rounded-full" />
        </div>
      </div>
    ))}
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
      className,
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

// HeroSectionSkeleton — inline Suspense fallback for HeroSection (fetches market rates).
// Mirrors HeroSection.module.css .root: grid 1.15fr / 0.85fr, min-height ~85vh.
export const HeroSectionSkeleton: FC = () => (
  <div
    style={{ gap: 'var(--ds-space-6)', alignItems: 'center', minHeight: 'clamp(320px,55vh,520px)' }}
    className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]"
  >
    {/* Copy column — eyebrow + 2-line headline + sub + 3 pills + 3 CTAs + stats bar */}
    <div className="flex flex-col gap-4 py-8 sm:py-12 lg:py-16">
      <SkeletonBase className="h-4 w-28 rounded-full" />
      <SkeletonBase className="h-10 sm:h-12 lg:h-[3.25rem] w-full rounded-xl" />
      <SkeletonBase className="h-10 sm:h-12 lg:h-[3.25rem] w-4/5 rounded-xl" />
      <SkeletonBase className="h-4 w-full rounded-lg" />
      <SkeletonBase className="h-4 w-3/4 rounded-lg" />
      <div className="flex gap-2 mt-1">
        {(['pill-a', 'pill-b', 'pill-c'] as const).map((k) => (
          <SkeletonBase key={k} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        <SkeletonBase className="h-11 w-36 rounded-xl" />
        <SkeletonBase className="h-11 w-32 rounded-xl" />
        <SkeletonBase className="h-11 w-24 rounded-xl" />
      </div>
      <div className="flex gap-5 mt-2">
        {(['s1', 's2', 's3'] as const).map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <SkeletonBase className="h-5 w-12 rounded-md" />
            <SkeletonBase className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>

    {/* Visual column — 3 stacked glass cards (desktop only) */}
    <div className="hidden lg:flex flex-col gap-3 ps-4">
      {/* Card 1: نرخ‌های زنده */}
      <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/80 dark:bg-neutral-800/60 backdrop-blur p-4 space-y-3 shadow-lg">
        <div className="flex justify-between items-center">
          <SkeletonBase className="h-4 w-16 rounded-md" />
          <SkeletonBase className="h-5 w-12 rounded-full" />
        </div>
        <SkeletonBase className="h-9 w-36 rounded-lg" />
        <div className="space-y-2 pt-1">
          {(['r1', 'r2', 'r3'] as const).map((k) => (
            <div key={k} className="flex justify-between items-center py-1">
              <SkeletonBase className="h-4 w-20 rounded-md" />
              <SkeletonBase className="h-4 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      {/* Card 2: محاسبه حواله */}
      <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/80 dark:bg-neutral-800/60 backdrop-blur p-4 space-y-3 shadow-md">
        <SkeletonBase className="h-4 w-24 rounded-md" />
        <SkeletonBase className="h-10 w-full rounded-xl" />
        <div className="space-y-2">
          {(['c1', 'c2', 'c3'] as const).map((k) => (
            <div key={k} className="flex justify-between">
              <SkeletonBase className="h-4 w-24 rounded-md" />
              <SkeletonBase className="h-4 w-16 rounded-md" />
            </div>
          ))}
        </div>
        <SkeletonBase className="h-9 w-full rounded-xl" />
      </div>
      {/* Card 3: وضعیت سرویس */}
      <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/80 dark:bg-neutral-800/60 backdrop-blur p-3 flex items-center gap-3 shadow-sm">
        <SkeletonBase className="h-6 w-6 rounded-full shrink-0" />
        <SkeletonBase className="h-4 w-full rounded-md" />
      </div>
    </div>
  </div>
);

// HomePageSkeleton — loading.tsx fallback (first navigation only).
// ONLY async/data-heavy sections are mirrored.
// Static sections (ServicesSection, TrustSection, SectionSubscribe2) render
// instantly from the server and are intentionally NOT included here.
export const HomePageSkeleton: FC = () => (
  <div className="nc-HomePage relative">
    {/* ── Hero (async — fetches market rates) ──────────────────── */}
    <div className="container relative pt-6 sm:pt-8">
      <HeroSectionSkeleton />
    </div>

    {/* ServicesSection renders instantly (static) — gap only */}
    <div className="mt-6 lg:mt-8" aria-hidden />

    {/* ── CryptoTicker + SectionLargeSlider ────────────────────── */}
    <div className="container relative">
      <div className="flex gap-3 sm:gap-4 overflow-hidden">
        {(['t1', 't2', 't3', 't4', 't5', 't6'] as const).map((k) => (
          <SkeletonBase
            key={k}
            className="h-[72px] sm:h-20 w-[160px] sm:w-[190px] rounded-xl sm:rounded-2xl shrink-0"
          />
        ))}
      </div>
      <div className="mt-4">
        <HomeFeaturedSliderSkeleton />
      </div>
    </div>

    {/* ── TrendingCategories ─────────────────────────────────────── */}
    <div className="container relative mt-4 lg:mt-5">
      <SectionCategoriesSkeleton />
    </div>

    {/* ── PulseSection ──────────────────────────────────────────── */}
    <div className="container relative mt-4 lg:mt-6">
      <PulseSectionSkeleton />
    </div>

    {/* ── AdStrips + Posts (stream together) ───────────────────── */}
    <div className="container relative mt-4 lg:mt-6">
      <AdBannerSkeleton />
    </div>
    <div className="container relative mt-4 lg:mt-6">
      <SectionMagazine7Skeleton />
    </div>
    <div className="container relative mt-4 lg:mt-6">
      <AdBannerSkeleton />
    </div>

    {/* ── TopAuthorsSection ─────────────────────────────────────── */}
    <div className="container relative mt-4 lg:mt-6">
      <SectionAuthorsSkeleton />
    </div>

    {/* TrustSection + Newsletter render instantly (static) */}
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
          <div
            key={i}
            className="relative flex-1 h-[160px] sm:h-[180px] lg:h-auto rounded-2xl overflow-hidden"
          >
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

export const PulseSectionSkeleton: FC = () => (
  <div className="space-y-4" aria-live="polite" aria-label="در حال بارگذاری آخرین مقالات">
    <div className="flex gap-2 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <SkeletonBase key={i} className="h-9 w-24 rounded-full shrink-0" />
      ))}
    </div>
    <div
      className={cn(
        'rounded-3xl overflow-hidden',
        'bg-white dark:bg-neutral-800/90',
        'border border-neutral-200/80 dark:border-neutral-700/80',
      )}
    >
      <SkeletonBase className="h-10 w-full rounded-none" />
      <div className="p-5 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 p-3 rounded-xl">
            <SkeletonBase className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl shrink-0" />
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

// SectionMagazine7Skeleton — mirrors SectionMagazine7's real layout:
//   header row: icon-box + title + subtitle | "مشاهده همه" button
//   row 1: 2 large Card10V3 (lg:grid-cols-2, aspect 16/10)
//   row 2: 4 small Card10  (lg:grid-cols-4, aspect 4/3)
export const SectionMagazine7Skeleton: FC = () => (
  <div className="space-y-6 sm:space-y-10">
    {/* Header */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 sm:gap-5">
        <SkeletonBase className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl" />
        <div className="space-y-2">
          <SkeletonBase className="h-6 sm:h-7 w-36 sm:w-44 rounded-lg" />
          <SkeletonBase className="h-4 w-28 sm:w-36 rounded-md" />
        </div>
      </div>
      <SkeletonBase className="h-10 w-28 rounded-2xl" />
    </div>
    {/* 2 large cards */}
    <div className="grid gap-4 sm:gap-5 md:gap-6 lg:grid-cols-2">
      {(['lg-a', 'lg-b'] as const).map((k) => (
        <div
          key={k}
          className={cn(
            'rounded-3xl overflow-hidden',
            'border border-neutral-200/60 dark:border-neutral-700/60',
            'bg-white/70 dark:bg-neutral-800/60',
          )}
        >
          <SkeletonBase className="aspect-[16/10] w-full rounded-none" />
          <div className="p-4 sm:p-5 space-y-3">
            <SkeletonBase className="h-5 w-20 rounded-full" />
            <SkeletonBase className="h-6 w-full rounded-md" />
            <SkeletonBase className="h-5 w-3/4 rounded-md" />
            <div className="flex items-center gap-2 pt-1">
              <SkeletonBase className="h-7 w-7 rounded-full" />
              <SkeletonBase className="h-3 w-20 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
    {/* 4 small cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
      {(['sm-a', 'sm-b', 'sm-c', 'sm-d'] as const).map((k) => (
        <div
          key={k}
          className={cn(
            'rounded-2xl sm:rounded-3xl overflow-hidden',
            'border border-neutral-200/60 dark:border-neutral-700/60',
            'bg-white/70 dark:bg-neutral-800/60',
          )}
        >
          <SkeletonBase className="aspect-[4/3] w-full rounded-none" />
          <div className="p-3 sm:p-4 space-y-2">
            <SkeletonBase className="h-4 w-3/4 rounded-md" />
            <SkeletonBase className="h-4 w-1/2 rounded-md" />
            <div className="flex items-center gap-2 pt-1">
              <SkeletonBase className="h-6 w-6 rounded-full" />
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

export const AdBannerSkeleton: FC = () => (
  <div className={cn('relative rounded-2xl overflow-hidden', 'bg-neutral-100 dark:bg-neutral-800')}>
    <SkeletonBase className="h-[120px] sm:h-[150px] lg:h-[180px] w-full rounded-none" />
  </div>
);

export const NewsletterSkeleton: FC = () => (
  <div
    className={cn(
      'relative rounded-3xl overflow-hidden p-8 sm:p-12',
      'bg-neutral-100 dark:bg-neutral-800',
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

export const ArchivePageSkeleton: FC<{ cols?: number }> = ({ cols: _cols = 4 }) => (
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
      className,
    )}
  >
    <SkeletonBase className="aspect-[4/3] w-full rounded-none" />
    <div className="p-5 space-y-3">
      <SkeletonBase className="h-5 w-full rounded-md" />
      <SkeletonBase className="h-5 w-3/4 rounded-md" />
    </div>
  </div>
);

/*
  SinglePostSkeleton — mirrors PageSingle layout exactly:
  - Background gradient wrapper
  - Two-col flex: article (70%) + aside sidebar (30%)
    article:
      hero image (aspect-16/9) with gradient overlay
      SingleHeader glass card overlapping image (glass card with breadcrumb + title + meta bar)
      body content paragraphs
    sidebar (sticky): glass card with widgets
  - RelatedPosts section below
*/
export const SinglePostSkeleton: FC = () => (
  <div className="nc-PageSingle relative min-h-screen">
    <div className="relative container pt-6 pb-12 lg:pt-8 lg:pb-16">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* ── Main article col (≈70%) ── */}
        <article className="w-full lg:basis-[68%] xl:basis-[70%] grow-0 shrink">
          {/* Hero image — aspect-16/9 rounded-2xl */}
          <SkeletonBase className="w-full aspect-[16/9] md:aspect-[16/9] lg:aspect-[21/9] rounded-2xl lg:rounded-3xl" />

          {/* SingleHeader glass card — overlaps image, -mt-16 to -32 */}
          <div className="relative -mt-16 sm:-mt-20 lg:-mt-24 z-20 mx-3 sm:mx-4 lg:mx-6">
            <div className="rounded-2xl lg:rounded-3xl bg-white/90 dark:bg-neutral-900/90 border border-white/50 dark:border-neutral-800/50 shadow-xl overflow-hidden">
              <div className="p-6 sm:p-8 lg:p-10 space-y-5">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2">
                  <SkeletonBase className="h-3.5 w-24 rounded-md" />
                  <SkeletonBase className="h-3 w-3 rounded-sm" />
                  <SkeletonBase className="h-3.5 w-20 rounded-md" />
                </div>
                {/* Title */}
                <SkeletonBase className="h-7 sm:h-8 w-full rounded-lg" />
                <SkeletonBase className="h-7 sm:h-8 w-4/5 rounded-lg" />
                {/* Divider */}
                <div className="h-px bg-neutral-200/60 dark:bg-neutral-700/60" />
                {/* Meta row: avatar + date + reading time | actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBase className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5">
                      <SkeletonBase className="h-3.5 w-24 rounded-md" />
                      <SkeletonBase className="h-3 w-20 rounded-md" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <SkeletonBase className="h-8 w-8 rounded-lg" />
                    <SkeletonBase className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              </div>
              {/* Bottom accent bar */}
              <div className="h-1 bg-gradient-to-l from-neutral-300 via-neutral-200 to-transparent dark:from-neutral-700" />
            </div>
          </div>

          {/* Article body */}
          <div className="mt-8 lg:mt-10 space-y-3">
            {[100, 92, 100, 78, 100, 86, 100, 65, 100, 88, 100, 72, 100, 90, 58].map((w, i) => (
              <SkeletonBase key={i} className="h-4 rounded-md" style={{ width: `${w}%` }} />
            ))}
          </div>
        </article>

        {/* ── Sidebar (≈30%, sticky) ── */}
        <aside className="w-full lg:basis-[32%] xl:basis-[30%] grow-0 shrink">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-2xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-800/50 p-5 space-y-4">
              {/* Recent posts widget */}
              <SkeletonBase className="h-5 w-24 rounded-md" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <SkeletonBase className="h-14 w-14 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonBase className="h-3.5 w-full rounded-md" />
                    <SkeletonBase className="h-3.5 w-3/4 rounded-md" />
                    <SkeletonBase className="h-3 w-16 rounded-md" />
                  </div>
                </div>
              ))}
              {/* Tags widget */}
              <SkeletonBase className="h-5 w-20 rounded-md mt-2" />
              <div className="flex flex-wrap gap-2">
                {[55, 70, 50, 65, 80, 60].map((w, i) => (
                  <SkeletonBase key={i} className="h-7 rounded-full" style={{ width: w }} />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Related posts section */}
      <div className="mt-16 lg:mt-24 space-y-5">
        <SkeletonBase className="h-7 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/70"
            >
              <SkeletonBase className="aspect-[16/9] w-full rounded-none" />
              <div className="p-4 space-y-2.5">
                <SkeletonBase className="h-4 w-20 rounded-full" />
                <SkeletonBase className="h-5 w-full rounded-md" />
                <SkeletonBase className="h-5 w-3/4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
  <div className="container py-6 sm:py-10 lg:py-12 space-y-8 sm:space-y-10">
    {/*
      Hero — mirrors AuthorProfileHero exactly:
      dark mesh bg + top row (avatar ring + badge) + name block + chips + bio + stats strip
      No cover band — the real component uses CSS mesh, not an image band.
    */}
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{ background: 'oklch(18% 0.015 250)', minHeight: '260px' }}
    >
      {/* Inner content */}
      <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-8 pb-0">
        {/* Top row: avatar + badge */}
        <div className="flex items-start justify-between gap-4 mb-5">
          {/* Avatar ring */}
          <SkeletonBase
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex-shrink-0"
            style={{ background: 'oklch(30% 0.02 250)' }}
          />
          {/* Role badge */}
          <SkeletonBase
            className="h-6 w-28 rounded-full"
            style={{ background: 'oklch(28% 0.02 250)' }}
          />
        </div>

        {/* Name block */}
        <div className="space-y-2 mb-4">
          <SkeletonBase
            className="h-9 sm:h-11 w-56 rounded-lg"
            style={{ background: 'oklch(28% 0.02 250)' }}
          />
          <SkeletonBase
            className="h-1.5 w-48 rounded-full"
            style={{ background: 'oklch(32% 0.04 200)' }}
          />
        </div>

        {/* Chips: job + company */}
        <div className="flex gap-2 mb-4">
          <SkeletonBase
            className="h-7 w-28 rounded-full"
            style={{ background: 'oklch(28% 0.02 250)' }}
          />
          <SkeletonBase
            className="h-7 w-24 rounded-full"
            style={{ background: 'oklch(28% 0.02 250)' }}
          />
        </div>

        {/* Bio lines */}
        <div className="space-y-2 pb-6">
          <SkeletonBase
            className="h-4 w-full rounded-md"
            style={{ background: 'oklch(26% 0.015 250)' }}
          />
          <SkeletonBase
            className="h-4 w-4/5 rounded-md"
            style={{ background: 'oklch(26% 0.015 250)' }}
          />
        </div>
      </div>

      {/* Stats strip — 4-column frosted bar at the bottom */}
      <div
        className="relative z-10 grid grid-cols-4 divide-x divide-x-reverse"
        style={{
          borderTop: '1px solid oklch(30% 0.02 250)',
          background: 'oklch(20% 0.015 250 / 0.7)',
        }}
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-4 px-2">
            <SkeletonBase
              className="h-6 w-10 rounded-md"
              style={{ background: 'oklch(30% 0.02 250)' }}
            />
            <SkeletonBase
              className="h-3 w-12 rounded-md"
              style={{ background: 'oklch(26% 0.015 250)' }}
            />
          </div>
        ))}
      </div>
    </div>

    {/* Posts grid — mirrors AuthorPostsGrid (section header + Card11 grid) */}
    <div>
      {/* Section header: icon + title + count */}
      <div className="mb-4 sm:mb-5 flex items-center gap-2">
        <SkeletonBase className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex-shrink-0" />
        <div className="space-y-1">
          <SkeletonBase className="h-5 w-20 rounded-md" />
          <SkeletonBase className="h-3.5 w-32 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden bg-white dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/70"
          >
            <SkeletonBase className="aspect-[16/9] w-full rounded-none" />
            <div className="p-4 space-y-2.5">
              <SkeletonBase className="h-4 w-20 rounded-full" />
              <SkeletonBase className="h-5 w-full rounded-md" />
              <SkeletonBase className="h-5 w-3/4 rounded-md" />
              <div className="flex items-center gap-2 pt-1">
                <SkeletonBase className="h-3 w-16 rounded-md" />
                <SkeletonBase className="h-3 w-12 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Related authors — mirrors AuthorRelated (SectionHeader + 4-col grid of AuthorCard) */}
    <div>
      <div className="mb-4 flex items-center gap-2">
        <SkeletonBase className="h-8 w-8 rounded-xl flex-shrink-0" />
        <div className="space-y-1">
          <SkeletonBase className="h-5 w-24 rounded-md" />
          <SkeletonBase className="h-3.5 w-36 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/70"
          >
            <SkeletonBase className="h-16 w-16 rounded-full" />
            <div className="w-full text-center space-y-1.5">
              <SkeletonBase className="h-4 w-3/4 rounded-md mx-auto" />
              <SkeletonBase className="h-3 w-1/2 rounded-md mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ContactPageSkeleton: FC = () => (
  <div>
    {/*
      Header — mirrors ContactForm header: eyebrow dot + title + subtitle
    */}
    <div className="text-center py-10 sm:py-12 px-4 space-y-4">
      <div className="flex items-center justify-center gap-2">
        <SkeletonBase className="h-2 w-2 rounded-full" />
        <SkeletonBase className="h-4 w-20 rounded-md" />
      </div>
      <SkeletonBase className="h-10 sm:h-12 w-64 rounded-xl mx-auto" />
      <SkeletonBase className="h-4 w-72 rounded-lg mx-auto" />
    </div>

    {/*
      Two-column grid — mirrors ContactForm layout:
      col 1: info cards (آدرس + ایمیل + تلفن) + social links
      col 2: form card (name + email + message + submit)
    */}
    <div className="container pb-12 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 lg:gap-8 max-w-5xl mx-auto">
      {/* Info column */}
      <aside className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <SkeletonBase className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5">
              <SkeletonBase className="h-3.5 w-16 rounded-md" />
              <SkeletonBase className="h-4 w-28 rounded-md" />
            </div>
          </div>
        ))}
        {/* Social links row */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60 space-y-3">
          <SkeletonBase className="h-4 w-24 rounded-md" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <SkeletonBase key={i} className="h-9 w-9 rounded-xl" />
            ))}
          </div>
        </div>
      </aside>

      {/* Form column */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60 space-y-5">
        <SkeletonBase className="h-6 w-28 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
        {/* Textarea */}
        <SkeletonBase className="h-32 w-full rounded-xl" />
        {/* Submit */}
        <SkeletonBase className="h-12 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

/*
  MoneyTransferSkeleton — mirrors MoneyTransferPage order exactly:
  1. HeroConverter (full-width gradient bg) — headline + category chips + calculator card + CTA
  2. LiveTicker (mt-3/4) — thin full-width strip
  3. container py-6…14 space-y-10/16:
     3a. RateComparisonSection:
         - ExchangeQuotesBoard (eyebrow+header + tabbed table)
         - RateComparisonTable (eyebrow+header + controls + table rows)
     3b. TrustStrip — 4 metric tiles
     3c. ExchangeRateTableView — section header + tab bar + rate table rows
     3d. RateListGrid — section header + 3-col rate cards
     3e. TransferRequestCTA — form card
     3f. FeatureList — 3-col feature cards
     3g. FAQ — accordion list
*/
export const MoneyTransferSkeleton: FC = () => (
  <div
    dir="rtl"
    className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    aria-busy="true"
    aria-label="در حال بارگذاری صرافی…"
  >
    {/* 1 ── HeroConverter ── */}
    <div
      className="w-full py-10 sm:py-14 px-4 sm:px-6"
      style={{ background: 'var(--ds-canvas-subtle)' }}
    >
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Headline */}
        <div className="space-y-3">
          <SkeletonBase className="h-5 w-28 rounded-full" />
          <SkeletonBase className="h-10 sm:h-12 w-3/4 rounded-xl" />
          <SkeletonBase className="h-5 w-1/2 rounded-lg" />
        </div>
        {/* Quick category chips */}
        <div className="flex gap-2 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <SkeletonBase key={i} className="h-10 w-20 rounded-full" />
          ))}
        </div>
        {/* Calculator card */}
        <SkeletonBase className="h-[280px] sm:h-[320px] w-full rounded-2xl" />
        {/* CTA buttons */}
        <div className="flex gap-3">
          <SkeletonBase className="h-12 w-40 rounded-xl" />
          <SkeletonBase className="h-12 w-32 rounded-xl" />
        </div>
        {/* Stats row */}
        <div className="flex gap-4 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <SkeletonBase key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>
    </div>

    {/* 2 ── LiveTicker strip ── */}
    <SkeletonBase className="h-11 w-full rounded-none mt-3" />

    {/* 3 ── Body container ── */}
    <div className="container px-4 sm:px-6 py-6 sm:py-10 lg:py-14 space-y-10 sm:space-y-16">
      {/* 3a — RateComparisonSection */}
      <div className="space-y-10 sm:space-y-12">
        {/* ExchangeQuotesBoard */}
        <div className="space-y-4">
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-24 rounded-full" />
            <SkeletonBase className="h-7 w-60 rounded-xl" />
            <SkeletonBase className="h-4 w-3/4 rounded-lg" />
          </div>
          <div className="rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="flex gap-1 p-2 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200/60 dark:border-neutral-700/60">
              {[...Array(4)].map((_, i) => (
                <SkeletonBase key={i} className="h-10 w-16 rounded-xl" />
              ))}
            </div>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 border-b last:border-0 border-neutral-100/60 dark:border-neutral-700/60"
              >
                <SkeletonBase className="h-5 w-7 rounded-sm flex-shrink-0" />
                <SkeletonBase className="h-4 w-28 rounded-lg flex-shrink-0" />
                <SkeletonBase className="h-4 flex-1 rounded-lg" />
                <SkeletonBase className="h-4 flex-1 rounded-lg" />
                <SkeletonBase className="h-7 w-16 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* RateComparisonTable */}
        <div className="space-y-4">
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-32 rounded-full" />
            <SkeletonBase className="h-7 w-72 rounded-xl" />
            <SkeletonBase className="h-4 w-2/3 rounded-lg" />
          </div>
          <div className="rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="flex flex-col gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200/60 dark:border-neutral-700/60">
              <div className="flex gap-2 flex-wrap">
                <SkeletonBase className="h-10 w-44 rounded-xl" />
                {[...Array(4)].map((_, i) => (
                  <SkeletonBase key={i} className="h-8 w-10 rounded-full" />
                ))}
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 border-b last:border-0 border-neutral-100/60 dark:border-neutral-700/60"
              >
                <div className="flex items-center gap-2 flex-[2]">
                  <SkeletonBase className="h-5 w-5 rounded-full flex-shrink-0" />
                  <div className="space-y-1 flex-1">
                    <SkeletonBase className="h-3.5 w-24 rounded-md" />
                    <SkeletonBase className="h-2.5 w-14 rounded-md" />
                  </div>
                </div>
                <SkeletonBase className="h-3 flex-1 rounded-md" />
                <SkeletonBase className="h-3 flex-1 rounded-md" />
                <SkeletonBase className="h-4 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3b — TrustStrip: 4 metric tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800/90"
          >
            <SkeletonBase className="h-7 w-20 rounded-lg" />
            <SkeletonBase className="h-3.5 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* 3c — ExchangeRateTableView: section header + tab bar + rows */}
      <div className="space-y-4">
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-28 rounded-full" />
          <SkeletonBase className="h-7 w-56 rounded-xl" />
        </div>
        <div className="rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60">
          {/* Tab bar */}
          <div className="flex gap-1 p-2 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200/60 dark:border-neutral-700/60">
            {[...Array(5)].map((_, i) => (
              <SkeletonBase key={i} className="h-9 w-20 rounded-xl" />
            ))}
          </div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b last:border-0 border-neutral-100/60 dark:border-neutral-700/60"
            >
              <SkeletonBase className="h-5 w-6 rounded-sm flex-shrink-0" />
              <div className="flex flex-col gap-1 flex-[2]">
                <SkeletonBase className="h-3.5 w-24 rounded-md" />
                <SkeletonBase className="h-2.5 w-16 rounded-md" />
              </div>
              <SkeletonBase className="h-4 flex-1 rounded-md" />
              <SkeletonBase className="h-4 flex-1 rounded-md" />
              <SkeletonBase className="h-5 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 3d — RateListGrid: section header + 3-col cards */}
      <div className="space-y-4">
        <SkeletonBase className="h-7 w-40 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200/60 dark:border-neutral-700/60">
                <SkeletonBase className="h-4 w-24 rounded-lg" />
                <SkeletonBase className="h-4 w-16 rounded-full" />
              </div>
              {[...Array(6)].map((_, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 border-neutral-100/60 dark:border-neutral-700/60"
                >
                  <SkeletonBase className="h-3 w-24 rounded-md" />
                  <SkeletonBase className="h-3 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 3e — TransferRequestCTA: form card */}
      <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800/90 p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-24 rounded-full" />
          <SkeletonBase className="h-7 w-56 rounded-xl" />
          <SkeletonBase className="h-4 w-2/3 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonBase className="h-12 w-full rounded-xl" />
          <SkeletonBase className="h-12 w-full rounded-xl" />
          <SkeletonBase className="h-12 w-full rounded-xl" />
          <SkeletonBase className="h-12 w-full rounded-xl" />
        </div>
        <SkeletonBase className="h-24 w-full rounded-xl" />
        <SkeletonBase className="h-12 w-40 rounded-xl" />
      </div>

      {/* 3f — FeatureList: 3-col feature cards */}
      <div className="space-y-4">
        <SkeletonBase className="h-7 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800/90 p-5 space-y-3"
            >
              <SkeletonBase className="h-10 w-10 rounded-xl" />
              <SkeletonBase className="h-5 w-28 rounded-md" />
              <SkeletonBase className="h-4 w-full rounded-md" />
              <SkeletonBase className="h-4 w-4/5 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 3g — FAQ: accordion list */}
      <div className="space-y-3">
        <SkeletonBase className="h-7 w-36 rounded-xl mb-2" />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800/90 px-5 py-4 flex items-center justify-between"
          >
            <SkeletonBase className="h-4 flex-1 rounded-md me-4" />
            <SkeletonBase className="h-5 w-5 rounded-md flex-shrink-0" />
          </div>
        ))}
      </div>
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
  <div>
    {/*
      Header — mirrors SubscriptionPage: eyebrow + title (with accent) + subtitle
    */}
    <header className="text-center py-10 sm:py-12 px-4 space-y-4">
      <div className="flex items-center justify-center gap-1.5">
        <SkeletonBase className="h-3 w-3 rounded-sm" />
        <SkeletonBase className="h-4 w-24 rounded-md" />
      </div>
      <SkeletonBase className="h-10 sm:h-12 w-72 rounded-xl mx-auto" />
      <SkeletonBase className="h-5 w-56 rounded-lg mx-auto" />
    </header>

    {/*
      Pricing grid — 3 cards: plan name + price + desc + divider + features list + CTA button
      Middle card (popular) is slightly taller/bordered
    */}
    <section className="container pb-12 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[false, true, false].map((isPopular, i) => (
          <div
            key={i}
            className={cn(
              'relative p-6 rounded-2xl space-y-5',
              isPopular
                ? 'bg-white dark:bg-neutral-800 border-2 border-primary-400/70 dark:border-primary-500/50'
                : 'bg-white/80 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60',
            )}
          >
            {/* Popular badge */}
            {isPopular && (
              <SkeletonBase className="absolute -top-3 start-1/2 -translate-x-1/2 h-6 w-16 rounded-full" />
            )}
            {/* Plan name */}
            <SkeletonBase className="h-6 w-20 rounded-lg" />
            {/* Price */}
            <div className="flex items-baseline gap-1">
              <SkeletonBase className="h-10 w-16 rounded-lg" />
              <SkeletonBase className="h-4 w-12 rounded-md" />
            </div>
            {/* Desc */}
            <SkeletonBase className="h-4 w-full rounded-md" />
            {/* Divider */}
            <div className="border-t border-neutral-200/60 dark:border-neutral-700/60" />
            {/* Features */}
            <div className="space-y-3">
              {[...Array(i === 1 ? 5 : 4)].map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <SkeletonBase className="h-4 w-4 rounded-sm flex-shrink-0" />
                  <SkeletonBase className="h-4 flex-1 rounded-md" />
                </div>
              ))}
            </div>
            {/* CTA */}
            <SkeletonBase className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </section>
  </div>
);

// ============================================
// Authors Hub Page Skeleton
// Mirrors exactly: AuthorsHero (rounded-3xl card with grid 2-col) →
//   FeaturedSpotlight (rounded-3xl card) →
//   AuthorsGrid (SectionHeader + grid 2-5 col) →
//   AuthorsExpertiseCloud
// ============================================
export const AuthorsPageSkeleton: FC = () => (
  <div
    dir="rtl"
    className="container py-6 sm:py-10 lg:py-12 space-y-8 sm:space-y-12"
    aria-busy="true"
    aria-label="در حال بارگذاری نویسندگان"
  >
    {/*
      Hero — mirrors AuthorsHero:
      rounded-3xl card, 2-col grid:
        start: chip + h1 + p + stats-3col
        end: collage (circular bg + 3 positioned avatars)
    */}
    <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-center">
        {/* Copy column */}
        <div className="space-y-5">
          {/* chip */}
          <SkeletonBase className="h-7 w-36 rounded-full" />
          {/* h1 */}
          <SkeletonBase className="h-10 sm:h-12 w-4/5 rounded-xl" />
          <SkeletonBase className="h-10 sm:h-12 w-3/5 rounded-xl" />
          {/* body */}
          <SkeletonBase className="h-4 w-full rounded-md" />
          <SkeletonBase className="h-4 w-5/6 rounded-md" />
          {/* 3-col stats grid — icon + value + label per cell */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white/60 dark:bg-neutral-900/40 px-2.5 py-3 sm:px-4 sm:py-4"
              >
                <SkeletonBase className="h-4 w-4 rounded-sm" />
                <SkeletonBase className="h-6 w-10 rounded-md" />
                <SkeletonBase className="h-3 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Collage column — circular ambient + 3 author avatars */}
        <div className="relative h-[260px] sm:h-[320px] lg:h-[380px]">
          {/* ambient circle */}
          <SkeletonBase className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 h-44 w-44 sm:h-56 sm:w-56 lg:h-64 lg:w-64 rounded-full" />
          {/* top center avatar */}
          <div className="absolute top-0 start-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <SkeletonBase className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
            <SkeletonBase className="h-3 w-16 rounded-md" />
          </div>
          {/* bottom-end avatar */}
          <div className="absolute bottom-2 end-2 flex flex-col items-center gap-2">
            <SkeletonBase className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" />
            <SkeletonBase className="h-3 w-14 rounded-md" />
          </div>
          {/* bottom-start avatar */}
          <div className="absolute bottom-2 start-2 flex flex-col items-center gap-2">
            <SkeletonBase className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" />
            <SkeletonBase className="h-3 w-14 rounded-md" />
          </div>
        </div>
      </div>
    </div>

    {/* Featured spotlight — mirrors FeaturedSpotlight */}
    <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-neutral-200/60 dark:border-neutral-800/60 p-5 sm:p-7 lg:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-center">
        <div className="flex flex-col items-center lg:items-start gap-3">
          <SkeletonBase className="h-28 w-28 sm:h-32 sm:w-32 rounded-full" />
          <SkeletonBase className="h-6 w-28 rounded-full" />
        </div>
        <div className="space-y-3">
          <SkeletonBase className="h-8 w-48 rounded-lg" />
          <SkeletonBase className="h-4 w-36 rounded-md" />
          <SkeletonBase className="h-4 w-full rounded-md" />
          <SkeletonBase className="h-4 w-4/5 rounded-md" />
          <SkeletonBase className="h-4 w-3/5 rounded-md" />
          <div className="flex gap-3 pt-2">
            <SkeletonBase className="h-8 w-24 rounded-full" />
            <SkeletonBase className="h-8 w-36 rounded-full" />
          </div>
        </div>
      </div>
    </div>

    {/* Authors grid — mirrors AuthorsGrid (SectionHeader + grid 2-to-5 cols) */}
    <div>
      {/* SectionHeader: icon + title + subtitle */}
      <div className="mb-5 flex items-center gap-2">
        <SkeletonBase className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex-shrink-0" />
        <div className="space-y-1">
          <SkeletonBase className="h-5 w-28 rounded-md" />
          <SkeletonBase className="h-3.5 w-48 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center p-4 rounded-2xl gap-3 bg-white dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/70"
          >
            <SkeletonBase className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" />
            <div className="w-full space-y-1.5 text-center">
              <SkeletonBase className="h-4 w-3/4 rounded-md mx-auto" />
              <SkeletonBase className="h-3 w-1/2 rounded-md mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Expertise cloud — mirrors AuthorsExpertiseCloud (SectionHeader + category cards) */}
    <div>
      <div className="mb-5 flex items-center gap-2">
        <SkeletonBase className="h-8 w-8 rounded-xl flex-shrink-0" />
        <div className="space-y-1">
          <SkeletonBase className="h-5 w-32 rounded-md" />
          <SkeletonBase className="h-3.5 w-44 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800/90 p-4 space-y-3"
          >
            <SkeletonBase className="h-5 w-28 rounded-md" />
            <div className="flex flex-wrap gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-1.5">
                  <SkeletonBase className="h-6 w-6 rounded-full" />
                  <SkeletonBase className="h-3.5 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// About Page Skeleton
// Mirrors: AboutPageClient exactly:
//   1. Hero section (eyebrow + h1 + body)
//   2. Stats section (title + subtitle + 4-col StatCard grid)
//   3. Mission section (text col + values col: 3 items)
//   + SectionSubscribe2
// ============================================
export const AboutPageSkeleton: FC = () => (
  <div dir="rtl" aria-busy="true" aria-label="در حال بارگذاری صفحه درباره ما">
    {/* ── Hero section ── */}
    <section className="relative overflow-hidden py-16 sm:py-20 lg:py-24 px-4 text-center">
      {/* Eyebrow */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <SkeletonBase className="h-2.5 w-2.5 rounded-full" />
        <SkeletonBase className="h-4 w-20 rounded-md" />
      </div>
      {/* h1 two-line */}
      <SkeletonBase className="h-10 sm:h-12 w-72 rounded-xl mx-auto mb-3" />
      <SkeletonBase className="h-10 sm:h-12 w-56 rounded-xl mx-auto mb-6" />
      {/* body text */}
      <SkeletonBase className="h-4 w-full max-w-xl rounded-md mx-auto mb-2" />
      <SkeletonBase className="h-4 w-4/5 max-w-lg rounded-md mx-auto" />
    </section>

    {/* ── Stats section ── */}
    <section className="py-10 sm:py-12 px-4">
      <div className="text-center mb-8 space-y-2">
        <SkeletonBase className="h-7 w-28 rounded-lg mx-auto" />
        <SkeletonBase className="h-4 w-44 rounded-md mx-auto" />
      </div>
      {/* 4-col grid of StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 max-w-3xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 py-6 px-4 rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60"
          >
            <SkeletonBase className="h-9 w-20 rounded-lg" />
            <SkeletonBase className="h-3.5 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </section>

    {/* ── Mission + Values section ── */}
    <section className="container py-10 sm:py-12 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Text col: eyebrow + h2 + body x2 */}
        <div className="space-y-4">
          <SkeletonBase className="h-4 w-24 rounded-md" />
          <SkeletonBase className="h-8 w-3/4 rounded-lg" />
          <SkeletonBase className="h-4 w-full rounded-md" />
          <SkeletonBase className="h-4 w-5/6 rounded-md" />
          <SkeletonBase className="h-4 w-full rounded-md" />
          <SkeletonBase className="h-4 w-4/5 rounded-md" />
        </div>
        {/* Values col: 3 items, each with icon + title + desc */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60"
            >
              <SkeletonBase className="h-10 w-10 rounded-xl flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBase className="h-4 w-36 rounded-md" />
                <SkeletonBase className="h-3.5 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Newsletter section */}
    <div className="container py-8 lg:py-12">
      <NewsletterSkeleton />
    </div>
  </div>
);
