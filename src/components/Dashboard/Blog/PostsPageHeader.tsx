'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import {
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentText,
  HiOutlineXMark,
  HiCheck,
} from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PostStatus } from '@prisma/client';

type FilterOption = 'همه' | PostStatus;

const filterOptions: Array<{ name: string; value: FilterOption }> = [
  { name: 'همه', value: 'همه' },
  { name: 'منتشر شده', value: 'PUBLISHED' },
  { name: 'پیشنویس', value: 'DRAFT' },
  { name: 'در انتظار بررسی', value: 'PENDING_REVIEW' },
];

interface PostsPageHeaderProps {
  searchParams: { page?: string; search?: string; filter?: 'همه' | PostStatus };
}

export default function PostsPageHeader({ searchParams }: PostsPageHeaderProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.search || '';
  const currentFilter = (searchParams.filter as FilterOption) || 'همه';

  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(currentSearchParams?.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset page when filter/search changes
      params.delete('page');
      startTransition(() => {
        router.push(`/dashboard/posts?${params.toString()}`);
      });
    },
    [currentSearchParams, router, startTransition],
  );

  const handleSearch = useCallback(() => {
    updateParams({ search: searchValue || undefined });
  }, [searchValue, updateParams]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    updateParams({ search: undefined });
  }, [updateParams]);

  const handleFilter = useCallback(
    (filter: FilterOption) => {
      updateParams({ filter: filter === 'همه' ? undefined : filter });
    },
    [updateParams],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
      if (e.key === 'Escape') handleClearSearch();
    },
    [handleSearch, handleClearSearch],
  );

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky top-0 z-40',
        'backdrop-blur-xl',
        'bg-white/80 dark:bg-slate-900/80',
        'border-b border-slate-200/60 dark:border-slate-800/60',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4">
          {/* Top row: title + create button */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="dash-ico dash-ico--violet w-10 h-10 shrink-0" aria-hidden>
                <HiOutlineDocumentText className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  مدیریت پستها
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  مشاهده، ویرایش و حذف محتوای وبلاگ
                </p>
              </div>
            </div>

            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dashboard/posts/create"
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white',
                  'bg-gradient-to-l from-violet-600 to-indigo-600',
                  'hover:from-violet-700 hover:to-indigo-700',
                  'shadow-lg shadow-violet-500/25',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                )}
              >
                <HiOutlinePlus className="w-4 h-4" />
                <span className="hidden sm:inline">پست جدید</span>
              </Link>
            </motion.div>
          </div>

          {/* Bottom row: search + filter */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <HiOutlineMagnifyingGlass className="w-4 h-4 text-slate-400" aria-hidden />
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="جستجو در عنوان و محتوا..."
                className={cn(
                  'w-full pr-10 pl-9 py-2.5 rounded-xl text-sm',
                  'bg-slate-50 dark:bg-slate-800/50',
                  'border border-slate-200 dark:border-slate-700',
                  'text-slate-900 dark:text-white',
                  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500',
                  'transition-all duration-200',
                )}
                aria-label="جستجوی پست"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="پاک کردن جستجو"
                >
                  <HiOutlineXMark className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter */}
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'gap-2 rounded-xl',
                    currentFilter !== 'همه' && 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20',
                  )}
                >
                  <span>{filterOptions.find((f) => f.value === currentFilter)?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                {filterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleFilter(option.value)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer',
                      currentFilter === option.value
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                        : 'text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {option.name}
                    {currentFilter === option.value && (
                      <HiCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active filter indicator */}
            {(currentFilter !== 'همه' || currentSearch) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                type="button"
                onClick={() => {
                  setSearchValue('');
                  updateParams({ search: undefined, filter: undefined });
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium',
                  'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
                  'hover:bg-rose-100 dark:hover:bg-rose-900/30',
                  'transition-colors duration-200',
                )}
              >
                <HiOutlineXMark className="w-3.5 h-3.5" />
                پاک کردن فیلتر
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500/20 overflow-hidden">
          <motion.div
            className="h-full bg-violet-500"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
    </motion.header>
  );
}
