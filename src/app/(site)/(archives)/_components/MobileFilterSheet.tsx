'use client';

/**
 * MobileFilterSheet — شیت فیلتر موبایل (شگفت‌انگیز)
 * ----------------------------------------------------------------------------
 * - باز/بسته شدن با انیمیشن
 * - استفاده از CommandPanel برای دسته‌بندی/تگ
 * - segmented sort در بالا
 * - search input زنده
 * - اعمال فیلتر با کلیک
 */

import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import type { TaxonomyType } from '@/types/types';
import { ArrowUpDown, Check, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useCallback, useState, useTransition } from 'react';
import { HiOutlineMagnifyingGlass, HiXMark } from 'react-icons/hi2';
import CommandPanel from './CommandPanel';
import CommandTrigger from './CommandTrigger';

type Props = {
  categories: TaxonomyType[];
  tags: TaxonomyType[];
  filters: { name: string }[];
  initialFilter: string;
  initialQuery: string;
  currentCategory?: TaxonomyType | null;
  currentTag?: TaxonomyType | null;
  activeFilterCount: number;
};

export default function MobileFilterSheet({
  categories,
  tags,
  filters,
  initialFilter,
  initialQuery,
  currentCategory,
  currentTag,
  activeFilterCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState<'category' | 'tag' | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleApply = useCallback(
    (next?: { filter?: string; q?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      const newFilter = next?.filter ?? filter;
      const newQuery = next?.q ?? query;
      if (newFilter && newFilter !== 'همه مقالات') {
        params.set('filter', newFilter);
      } else {
        params.delete('filter');
      }
      if (newQuery && newQuery.trim().length >= 2) {
        params.set('q', newQuery.trim());
      } else {
        params.delete('q');
      }
      params.delete('page');
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [filter, pathname, query, router, searchParams],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button type="button" className="arc-fab-v4 arc-focus" aria-label="باز کردن فیلترها">
            <span className="arc-fab-v4__icon" aria-hidden>
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <span className="arc-fab-v4__label">فیلترها</span>
            {activeFilterCount > 0 ? (
              <span className="arc-fab-v4__count">{activeFilterCount.toLocaleString('fa-IR')}</span>
            ) : null}
          </button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="arc-sheet-v4 rounded-t-3xl border-0 p-0 h-[90dvh] flex flex-col [&>button]:hidden"
        >
          <div className="arc-sheet-v4__handle" aria-hidden />
          <SheetTitle className="sr-only">فیلترهای آرشیو</SheetTitle>

          <div className="px-5 pt-2 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">فیلترهای آرشیو</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                نتایج را دقیق‌تر کنید
              </p>
            </div>
            <SheetClose
              className="arc-focus inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="بستن"
            >
              <HiXMark className="w-5 h-5" />
            </SheetClose>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
            {/* search */}
            <div>
              <label
                htmlFor="mobile-search"
                className="block text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-2"
              >
                جستجو در مقالات
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApply({ q: query });
                }}
                className="relative"
              >
                <HiOutlineMagnifyingGlass
                  className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-neutral-400 pointer-events-none"
                  aria-hidden
                />
                <input
                  id="mobile-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو…"
                  className="w-full h-11 pe-10 ps-10 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none text-sm transition-all"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      handleApply({ q: '' });
                    }}
                    className="absolute top-1/2 -translate-y-1/2 start-3 inline-flex w-6 h-6 items-center justify-center rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    aria-label="پاک کردن"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </form>
            </div>

            {/* sort */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  مرتب‌سازی
                </span>
              </div>
              <div className="arc-segmented-v4 w-full" role="tablist" aria-label="مرتب‌سازی">
                {filters.map((f) => {
                  const isActive = filter === f.name;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-current={isActive ? 'true' : undefined}
                      className="arc-segmented-v4__item flex-1 justify-center"
                      onClick={() => {
                        setFilter(f.name);
                        handleApply({ filter: f.name });
                      }}
                    >
                      {isActive ? <Check className="w-3 h-3" aria-hidden /> : null}
                      <span>{f.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* دسته‌بندی */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  دسته‌بندی
                </span>
                {currentCategory ? (
                  <span className="arc-compact-stat">{currentCategory.name}</span>
                ) : null}
              </div>
              <CommandTrigger
                mode="category"
                onClick={() => setCmdOpen('category')}
                count={categories.length}
                selectedName={currentCategory?.name ?? null}
                className="w-full justify-between"
              />
            </div>

            {/* تگ */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                  برچسب
                </span>
                {currentTag ? <span className="arc-compact-stat">#{currentTag.name}</span> : null}
              </div>
              <CommandTrigger
                mode="tag"
                onClick={() => setCmdOpen('tag')}
                count={tags.length}
                selectedName={currentTag?.name ?? null}
                className="w-full justify-between"
              />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl flex items-center gap-3">
            <Button
              variant="ghost"
              className="flex-1 h-12 rounded-xl"
              onClick={() => {
                setQuery('');
                setFilter('همه مقالات');
                router.push('/archive');
                setOpen(false);
              }}
            >
              پاک کردن همه
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl bg-primary-600 hover:bg-primary-700"
              onClick={() => {
                handleApply();
                setOpen(false);
              }}
              disabled={isPending}
            >
              {isPending ? 'در حال اعمال…' : 'اعمال فیلتر'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <CommandPanel
        open={cmdOpen === 'category'}
        onOpenChange={(o) => setCmdOpen(o ? 'category' : null)}
        mode="category"
        items={categories}
        title="انتخاب دسته‌بندی"
        description="موضوعات را مرور کنید یا جستجو کنید"
        currentSlug={currentCategory?.slug}
      />
      <CommandPanel
        open={cmdOpen === 'tag'}
        onOpenChange={(o) => setCmdOpen(o ? 'tag' : null)}
        mode="tag"
        items={tags}
        title="انتخاب برچسب"
        description="مقالات مرتبط با یک موضوع خاص"
        currentSlug={currentTag?.slug}
      />
    </>
  );
}
