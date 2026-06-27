'use client';

/**
 * FilterRail — نوار فیلتر مدرن (v4 — 2026)
 * ----------------------------------------------------------------------------
 * - استیکی هنگام اسکرول با glass blur 24px
 * - top accent bar متحرک
 * - search + cmd trigger + sort + view toggle
 * - suggestion chips برای quick-pick
 * - کیبورد شورتکات ⌘K (Ctrl+K) و `/`
 */

import type { TaxonomyType } from '@/types/types';
import { Search as SearchIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState, useTransition } from 'react';
import ArchiveSearchInput, { ARCHIVE_SEARCH_INPUT_ID } from './ArchiveSearchInput';
import ArchiveViewToggle from './ArchiveViewToggle';
import CommandPanel from './CommandPanel';
import CommandTrigger from './CommandTrigger';

type Props = {
  filters: { name: string }[];
  initialFilter: string;
  initialQuery: string;
  categories: TaxonomyType[];
  tags: TaxonomyType[];
  currentCategory?: TaxonomyType | null;
  currentTag?: TaxonomyType | null;
  quickPickTags: TaxonomyType[];
  showSuggestions: boolean;
};

export default function FilterRail({
  filters,
  initialFilter,
  initialQuery,
  categories,
  tags,
  currentCategory,
  currentTag,
  quickPickTags,
  showSuggestions,
}: Props) {
  const [cmdOpen, setCmdOpen] = useState<'category' | 'tag' | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setFilter = (name: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (name && name !== 'همه مقالات') params.set('filter', name);
    else params.delete('filter');
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // میانبرهای سراسری صفحه‌کلید — حس command-center
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen((prev) => (prev ? null : 'category'));
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        const input = document.getElementById(ARCHIVE_SEARCH_INPUT_ID) as HTMLInputElement | null;
        input?.focus();
        input?.select();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className="arc-rail-v4">
        <div className="arc-rail-v4__row">
          <div className="flex-1 min-w-0 max-w-xl">
            <ArchiveSearchInput initialQuery={initialQuery} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CommandTrigger
              mode="category"
              onClick={() => setCmdOpen('category')}
              count={categories.length}
              selectedName={currentCategory?.name ?? null}
            />
            <CommandTrigger
              mode="tag"
              onClick={() => setCmdOpen('tag')}
              count={tags.length}
              selectedName={currentTag?.name ?? null}
            />

            <div className="arc-segmented-v4" role="tablist" aria-label="مرتب‌سازی">
              {filters.map((f) => {
                const isActive = initialFilter === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-current={isActive ? 'true' : undefined}
                    className="arc-segmented-v4__item"
                    onClick={() => setFilter(f.name)}
                    title={f.name}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>

            <span className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-0.5" aria-hidden />
            <ArchiveViewToggle initialMode="grid" />

            <span
              className="arc-cmd-hint"
              aria-hidden
              title="میانبر: Ctrl+K برای دسته‌بندی، / برای جستجو"
            >
              <kbd className="arc-search-kbd">Ctrl</kbd>
              <kbd className="arc-search-kbd">K</kbd>
            </span>
          </div>
        </div>

        {showSuggestions && quickPickTags.length > 0 ? (
          <div className="arc-rail-v4__row">
            <span className="arc-quickpick-v4__label">
              <SearchIcon className="w-3.5 h-3.5" aria-hidden />
              <span>جستجوی پرطرفدار</span>
            </span>
            {quickPickTags.slice(0, 6).map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="arc-quickpick-v4__item"
                onClick={() => router.push(`/archive/tag/${tag.slug}`)}
              >
                <span className="arc-quickpick-v4__icon">
                  <span className="text-[10px] font-bold">#</span>
                </span>
                <span className="truncate max-w-[8rem]">{tag.name}</span>
                {typeof tag.count === 'number' ? (
                  <span className="arc-quickpick-v4__count">
                    {tag.count.toLocaleString('fa-IR')}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

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
