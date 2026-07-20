import { toPersianNumber } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { formatDate } from '@/utils/formatDate';
import Link from 'next/link';
import React, { type FC } from 'react';
import { HiCalendarDays, HiClock, HiFolder } from 'react-icons/hi2';

export interface PostMeta2Props {
  className?: string;
  meta: {
    date: Date | string | number;
    categories: PostWithRelations['categories'];
    readingTime: number;
  };
  hiddenCategories?: boolean;
  size?: 'large' | 'normal';
}

const PostMeta2: FC<PostMeta2Props> = ({
  className = 'leading-none',
  meta,
  hiddenCategories = false,
  size = 'normal',
}) => {
  const { date, categories, readingTime } = meta;

  return (
    <div
      className={`nc-PostMeta2 flex flex-wrap items-center gap-3 sm:gap-4 text-right rtl ${className}`}
    >
      {/* Date Badge */}
      <div className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50/80 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-900/50 transition-all duration-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:border-primary-200 dark:hover:border-primary-800">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm shadow-primary-500/30">
          <HiCalendarDays className="w-3 h-3 text-white" />
        </span>
        <span
          className={`font-medium text-primary-700 dark:text-primary-300 ${size === 'normal' ? 'text-xs' : 'text-[11px]'}`}
        >
          {formatDate(date)}
        </span>
      </div>

      {/* Reading Time Badge */}
      <div className="hidden sm:flex group items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 transition-all duration-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-200 dark:hover:border-emerald-800">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm shadow-emerald-500/30">
          <HiClock className="w-3 h-3 text-white" />
        </span>
        <span
          className={`font-medium text-emerald-700 dark:text-emerald-300 ${size === 'normal' ? 'text-xs' : 'text-[11px]'}`}
        >
          {toPersianNumber(readingTime)} دقیقه مطالعه
        </span>
      </div>

      {/* Categories */}
      {!hiddenCategories && categories.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50/80 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-900/50 transition-all duration-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:border-violet-200 dark:hover:border-violet-800">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm shadow-violet-500/30">
            <HiFolder className="w-3 h-3 text-white" />
          </span>
          <div
            className={`flex items-center gap-1 font-medium text-violet-700 dark:text-violet-300 ${size === 'normal' ? 'text-xs' : 'text-[11px]'}`}
          >
            {categories.slice(0, 2).map((cat, index) => (
              <React.Fragment key={cat.id}>
                <Link
                  href={`/category/${cat.id}`}
                  className="hover:text-violet-900 dark:hover:text-violet-200 transition-colors duration-200"
                >
                  {cat.name}
                </Link>
                {index < Math.min(categories.length, 2) - 1 && (
                  <span className="text-violet-400 dark:text-violet-600">،</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostMeta2;
