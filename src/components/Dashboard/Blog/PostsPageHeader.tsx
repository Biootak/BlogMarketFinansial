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
  HiOutlineCalendarDays,
  HiOutlineXMark,
  HiCheck,
} from 'react-icons/hi2';
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
  { name: 'زمان‌بندی شده', value: 'SCHEDULED' },
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

  const activeFilterName = filterOptions.find((f) => f.value === currentFilter)?.name ?? 'همه';
  const isFilterActive = currentFilter !== 'همه';

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky top-0 z-40',
        // sticky header — پدینگ داخلی، پشت‌زمینهٔ نیمه‌شفاف برای scroll over content
        'px-4 sm:px-5 lg:px-6 py-3',
        'bg-[color:var(--at-bg)]/85',
        'backdrop-blur supports-[backdrop-filter]:bg-[color:var(--at-bg)]/70',
        'border-b border-[color:var(--at-line)]',
        // negative margin برای پر کردن فاصلهٔ padding بیرونی dash2-page
        '-mx-4 sm:-mx-5 lg:-mx-6',
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Top row: title + actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="at-head__ico" aria-hidden>
              <HiOutlineDocumentText className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[color:var(--at-fg)] truncate">
                مدیریت پست‌ها
              </h1>
              <p className="text-xs text-[color:var(--at-fg-subtle)] mt-0.5 truncate">
                مشاهده، ویرایش و حذف محتوای وبلاگ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/dashboard/posts/calendar"
              className="at-btn at-btn--secondary"
            >
              <HiOutlineCalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">تقویم انتشار</span>
            </Link>
            <Link
              href="/dashboard/posts/create"
              className="at-btn at-btn--primary"
            >
              <HiOutlinePlus className="w-4 h-4" />
              <span className="hidden sm:inline">پست جدید</span>
            </Link>
          </div>
        </div>

        {/* Bottom row: search + filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <HiOutlineMagnifyingGlass className="w-4 h-4 text-[color:var(--at-fg-subtle)]" aria-hidden />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="جستجو در عنوان و محتوا..."
              className={cn(
                'at-input pr-9 pl-9 h-10 text-sm',
              )}
              aria-label="جستجوی پست"
            />
            {searchValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-[color:var(--at-fg-subtle)] hover:text-[color:var(--at-fg)] transition-colors"
                aria-label="پاک کردن جستجو"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'at-btn h-10 px-3 text-sm',
                  isFilterActive && 'border-[color:var(--at-accent)] text-[color:var(--at-accent-fg)] bg-[color:var(--at-accent-soft)]',
                )}
              >
                <span>{activeFilterName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-[10px] border-[color:var(--at-line)]">
              {filterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFilter(option.value)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer',
                    currentFilter === option.value
                      ? 'bg-[color:var(--at-accent-soft)] text-[color:var(--at-accent-fg)]'
                      : 'text-[color:var(--at-fg)]',
                  )}
                >
                  {option.name}
                  {currentFilter === option.value && (
                    <HiCheck className="w-4 h-4 text-[color:var(--at-accent)]" aria-hidden />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active filter indicator */}
          {(isFilterActive || currentSearch) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              type="button"
              onClick={() => {
                setSearchValue('');
                updateParams({ search: undefined, filter: undefined });
              }}
              className="at-btn at-btn--danger at-btn--sm"
            >
              <HiOutlineXMark className="w-3.5 h-3.5" />
              <span>پاک کردن فیلتر</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--at-accent)]/20 overflow-hidden rounded-b-[14px]">
          <motion.div
            className="h-full bg-[color:var(--at-accent)]"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}
    </motion.header>
  );
}