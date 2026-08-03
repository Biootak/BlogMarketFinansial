'use client';

import type { PostStatusCounts } from '@/actions/postActions';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import type { PostStatus } from '@prisma/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  HiOutlineBars3,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlineNewspaper,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineXMark,
} from 'react-icons/hi2';

type FilterOption = 'همه' | PostStatus;
export type ViewMode = 'magazine' | 'grid' | 'list';

interface PostsPageHeaderProps {
  searchParams: { page?: string; search?: string; filter?: 'همه' | PostStatus };
  counts: PostStatusCounts | null;
}

/**
 * KPI strip pills — هر کلیک = فیلتر سریع. pill فعال border اکسنت می‌گیرد.
 * toggle behavior: کلیک روی pill فعال = بازگشت به «همه».
 * اعداد به‌صورت localize فارسی + tabular-nums (حس بلومبرگ).
 */
const kpiChips: Array<{
  key: keyof PostStatusCounts | 'all';
  label: string;
  filter: FilterOption;
  icon: typeof HiOutlineDocumentText;
  tone: string; // کلاس رنگی برای dot + آیکون
}> = [
  { key: 'all', label: 'همه', filter: 'همه', icon: HiOutlineDocumentText, tone: 'slate' },
  {
    key: 'published',
    label: 'منتشر شده',
    filter: 'PUBLISHED',
    icon: HiOutlineEye,
    tone: 'emerald',
  },
  { key: 'draft', label: 'پیش‌نویس', filter: 'DRAFT', icon: HiOutlinePencilSquare, tone: 'slate' },
  {
    key: 'pending',
    label: 'در انتظار',
    filter: 'PENDING_REVIEW',
    icon: HiOutlineClipboardDocumentCheck,
    tone: 'amber',
  },
  { key: 'scheduled', label: 'زمان‌بندی', filter: 'SCHEDULED', icon: HiOutlineClock, tone: 'sky' },
];

const toneClasses: Record<
  string,
  { dot: string; iconActive: string; iconIdle: string; ring: string }
> = {
  slate: {
    dot: 'bg-[color:var(--at-fg-subtle)]',
    iconActive: 'text-[color:var(--at-accent-fg)]',
    iconIdle: 'text-[color:var(--at-fg-subtle)]',
    ring: 'shadow-[0_0_0_3px_color-mix(in_oklch,var(--at-fg-subtle)_18%,transparent)]',
  },
  emerald: {
    dot: 'bg-[color:var(--at-accent)]',
    iconActive: 'text-[color:var(--at-accent-fg)]',
    iconIdle: 'text-[color:var(--at-fg-subtle)]',
    ring: 'shadow-[0_0_0_3px_color-mix(in_oklch,var(--at-accent)_22%,transparent)]',
  },
  amber: {
    dot: 'bg-amber-500',
    iconActive: 'text-amber-700 dark:text-amber-300',
    iconIdle: 'text-[color:var(--at-fg-subtle)]',
    ring: 'shadow-[0_0_0_3px_color-mix(in_oklch,oklch(75%_0.16_75)_22%,transparent)]',
  },
  sky: {
    dot: 'bg-sky-500',
    iconActive: 'text-sky-700 dark:text-sky-300',
    iconIdle: 'text-[color:var(--at-fg-subtle)]',
    ring: 'shadow-[0_0_0_3px_color-mix(in_oklch,oklch(70%_0.13_225)_22%,transparent)]',
  },
};

export default function PostsPageHeader({ searchParams, counts }: PostsPageHeaderProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.search || '';
  const urlFilter = (searchParams.filter as FilterOption) || 'همه';

  // ── local state که فوراً sync می‌شود (قبل از server re-render) ──
  const [optimisticFilter, setOptimisticFilter] = useState<FilterOption>(urlFilter);
  useEffect(() => {
    setOptimisticFilter(urlFilter);
  }, [urlFilter]);

  const [searchValue, setSearchValue] = useState(currentSearch);
  const [viewMode, setViewMode] = useState<ViewMode>('magazine');

  // view mode — از localStorage بخوان، پیش‌فرض magazine
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('posts.viewMode') as ViewMode | null;
      if (stored === 'magazine' || stored === 'grid' || stored === 'list') {
        setViewMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('posts.viewMode', mode);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('posts:viewMode', { detail: mode }));
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(currentSearchParams?.toString() ?? '');
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete('page');
      startTransition(() => {
        router.push(`/dashboard/posts${params.toString() ? `?${params.toString()}` : ''}`);
      });
    },
    [currentSearchParams, router],
  );

  const handleSearch = useCallback(() => {
    const trimmed = searchValue.trim();
    updateParams({ search: trimmed || undefined });
  }, [searchValue, updateParams]);

  // ── Debounced real-time search ──
  // ۳۵۰ms بعد از آخرین تایپ، URL رو push می‌کنیم تا سرور لیست را با search تازه
  // واکشی کند. اگه searchValue با URL فعلی sync باشد، effect کاری نکند.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional debounce — only re-run on searchValue change
  useEffect(() => {
    const trimmed = searchValue.trim();
    const currentUrl = (searchParams.search || '').trim();
    if (trimmed === currentUrl) return;
    const timer = window.setTimeout(() => {
      handleSearch();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    updateParams({ search: undefined });
  }, [updateParams]);

  // ── toggle behavior: کلیک روی pill فعال = بازگشت به «همه» ──
  const handleFilter = useCallback(
    (filter: FilterOption) => {
      const next: FilterOption = optimisticFilter === filter ? 'همه' : filter;
      setOptimisticFilter(next); // فوری برای حس پاسخ‌گویی
      updateParams({ filter: next === 'همه' ? undefined : next });
    },
    [optimisticFilter, updateParams],
  );

  const handleClearAll = useCallback(() => {
    setSearchValue('');
    setOptimisticFilter('همه');
    updateParams({ search: undefined, filter: undefined });
  }, [updateParams]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
      if (e.key === 'Escape') handleClearSearch();
    },
    [handleSearch, handleClearSearch],
  );

  const isFilterActive = optimisticFilter !== 'همه';
  const isFilterAll = optimisticFilter === 'همه';

  // View mode buttons
  const viewModes = useMemo(
    () => [
      { key: 'magazine' as ViewMode, label: 'مجله', Icon: HiOutlineNewspaper },
      { key: 'grid' as ViewMode, label: 'گرید', Icon: HiOutlineSquares2X2 },
      { key: 'list' as ViewMode, label: 'فهرست', Icon: HiOutlineBars3 },
    ],
    [],
  );

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'sticky top-0 z-40',
        'px-4 sm:px-5 lg:px-6 pt-3 pb-3',
        'bg-[color:var(--at-bg)]/85',
        'backdrop-blur supports-[backdrop-filter]:bg-[color:var(--at-bg)]/70',
        'border-b border-[color:var(--at-line)]',
        '-mx-4 sm:-mx-5 lg:-mx-6',
      )}
    >
      {/* ── Row 1: title + primary actions ────────────────────────────── */}
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
          <Link href="/dashboard/posts/calendar" className="at-btn at-btn--secondary">
            <HiOutlineCalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">تقویم انتشار</span>
          </Link>
          <Link href="/dashboard/posts/create" className="at-btn at-btn--primary">
            <HiOutlinePlus className="w-4 h-4" />
            <span className="hidden sm:inline">پست جدید</span>
          </Link>
        </div>
      </div>

      {/* ── Row 2: Pills (right/start, compact scroll) ────────────── */}
      {counts && (
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
          {kpiChips.map((chip) => {
            const active = optimisticFilter === chip.filter;
            const value = counts[chip.key as keyof PostStatusCounts] ?? 0;
            const tone = toneClasses[chip.tone] ?? toneClasses.slate;
            const Icon = chip.icon;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => handleFilter(chip.filter)}
                className={cn(
                  'group relative inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-semibold whitespace-nowrap',
                  'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  'active:scale-[0.97]',
                  active
                    ? cn(
                        'bg-[color:var(--at-accent-soft)] border-[color:var(--at-accent)] text-[color:var(--at-accent-fg)]',
                        tone.ring,
                      )
                    : 'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line)] text-[color:var(--at-fg-muted)] hover:border-[color:var(--at-line-strong)] hover:text-[color:var(--at-fg)]',
                )}
                aria-pressed={active}
                title={
                  active
                    ? `کلیک کنید تا فیلتر ${chip.label} لغو شود`
                    : `فیلتر بر اساس ${chip.label}`
                }
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 transition-colors',
                    active ? tone.iconActive : tone.iconIdle,
                    !active && 'group-hover:text-[color:var(--at-fg-muted)]',
                  )}
                  aria-hidden
                />
                <span>{chip.label}</span>
                <span
                  className={cn(
                    'tabular-nums text-[11px] font-bold px-1 rounded',
                    active
                      ? 'text-[color:var(--at-accent-fg)]'
                      : 'text-[color:var(--at-fg-subtle)] group-hover:text-[color:var(--at-fg-muted)]',
                  )}
                >
                  {value.toLocaleString('fa-IR')}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Row 3: Search (prominent) + View Mode + Clear ────────────── */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {/* Search — جای‌گذاری منطقی (start/end) برای RTL درست */}
        <div className="relative flex-1 min-w-[220px]">
          {/* دکمهٔ سرچ — سمت چپ بصری (= inline-end در RTL)؛ کلیک‌پذیر */}
          <button
            type="button"
            onClick={handleSearch}
            className="absolute inset-y-0 end-0 flex items-center pe-3 text-[color:var(--at-fg-subtle)] hover:text-[color:var(--at-accent-fg)] active:text-[color:var(--at-accent-fg)] transition-colors focus:outline-none focus-visible:text-[color:var(--at-accent-fg)]"
            aria-label="جستجو"
            title="جستجو"
          >
            <HiOutlineMagnifyingGlass className="w-4 h-4" aria-hidden />
          </button>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="جستجو در عنوان و محتوا..."
            className="at-input ps-9 pe-9 h-10 text-sm"
            aria-label="جستجوی پست"
            dir="rtl"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute inset-y-0 start-0 flex items-center ps-3 text-[color:var(--at-fg-subtle)] hover:text-[color:var(--at-danger)] transition-colors focus:outline-none focus-visible:text-[color:var(--at-danger)]"
              aria-label="پاک کردن جستجو"
              title="پاک کردن"
            >
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div
          role="tablist"
          aria-label="نحوه نمایش"
          className="inline-flex items-center h-10 p-0.5 rounded-[10px] bg-[color:var(--at-bg-elevated)] border border-[color:var(--at-line)]"
        >
          {viewModes.map(({ key, label, Icon }) => {
            const active = viewMode === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={label}
                title={label}
                onClick={() => handleViewModeChange(key)}
                className={cn(
                  'relative inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-[8px] text-xs font-semibold',
                  'transition-all duration-200',
                  active
                    ? 'text-[color:var(--at-accent-fg)]'
                    : 'text-[color:var(--at-fg-muted)] hover:text-[color:var(--at-fg)]',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="posts-viewmode-pill"
                    className="absolute inset-0 rounded-[8px] bg-[color:var(--at-surface)] shadow-[var(--at-shadow-sm)] border border-[color:var(--at-line)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    aria-hidden
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" aria-hidden />
                <span className="hidden md:inline relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Active filter indicator — فقط وقتی فیلتر یا جستجو فعال است */}
        <AnimatePresence>
          {(isFilterActive || currentSearch) && !isFilterAll && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              type="button"
              onClick={handleClearAll}
              className="at-btn at-btn--danger at-btn--sm"
            >
              <HiOutlineXMark className="w-3.5 h-3.5" />
              <span>پاک کردن</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--at-accent)]/20 overflow-hidden rounded-b-[14px]">
          <motion.div
            className="h-full bg-[color:var(--at-accent)]"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          />
        </div>
      )}
    </motion.header>
  );
}
