'use client';

/**
 * AtelierToolbar — the archive command bar (2026).
 * A single sticky glass capsule: live search, sort segments, and category/tag
 * command panels. Behaviour (debounced search, ⌘K / "/" shortcuts) is reused
 * from the existing archive primitives; only the presentation is new.
 */

import { ArrowDownAZ, FolderOpen, Hash, RotateCcw, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState, useTransition } from 'react';
import type { TaxonomyType } from '@/types/types';
import ArchiveSearchInput, { ARCHIVE_SEARCH_INPUT_ID } from './ArchiveSearchInput';
import CommandPanel from './CommandPanel';
import CommandTrigger from './CommandTrigger';
import type { ActiveFilter } from './ActiveFilters';

type Props = {
  filters: { name: string }[];
  defaultFilter: string;
  initialFilter: string;
  initialQuery: string;
  categories: TaxonomyType[];
  tags: TaxonomyType[];
  currentCategory?: TaxonomyType | null;
  currentTag?: TaxonomyType | null;
  activeFilters: ActiveFilter[];
  totalCount: number;
};

const ACTIVE_ICONS = {
  search: Search,
  category: FolderOpen,
  tag: Hash,
  sort: ArrowDownAZ,
} as const;

export default function AtelierToolbar({
  filters,
  defaultFilter,
  initialFilter,
  initialQuery,
  categories,
  tags,
  currentCategory,
  currentTag,
  activeFilters,
  totalCount,
}: Props) {
  const [cmdOpen, setCmdOpen] = useState<'category' | 'tag' | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setFilter = (name: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (name && name !== defaultFilter) params.set('filter', name);
    else params.delete('filter');
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

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
      <div className="atl-toolbar">
        <div className="atl-toolbar__search">
          <ArchiveSearchInput initialQuery={initialQuery} />
        </div>

        <div className="atl-toolbar__group">
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

          <div className="atl-sort" role="tablist" aria-label="مرتب‌سازی">
            {filters.map((f) => {
              const isActive = initialFilter === f.name;
              return (
                <button
                  key={f.name}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className="atl-sort__item"
                  onClick={() => setFilter(f.name)}
                  title={f.name}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="atl-active" style={{ marginTop: 'var(--ds-space-4)' }}>
          <span className="atl-active__label">
            {totalCount.toLocaleString('fa-IR')} نتیجه برای
          </span>
          {activeFilters.map((f) => {
            const Icon = f.icon ? ACTIVE_ICONS[f.icon] : null;
            return (
              <Link
                key={`${f.type}:${f.label}`}
                href={f.href}
                className="atl-active__pill"
                aria-label={`حذف فیلتر ${f.label}`}
              >
                {Icon ? <Icon className="w-3 h-3" aria-hidden /> : null}
                <span className="max-w-[14rem] truncate">{f.label}</span>
                <span className="atl-x" aria-hidden>
                  <X className="w-3 h-3" />
                </span>
              </Link>
            );
          })}
          <Link href="/archive" className="atl-active__clear" aria-label="پاک کردن همه فیلترها">
            <RotateCcw className="w-3.5 h-3.5" aria-hidden />
            <span>پاک کردن</span>
          </Link>
        </div>
      ) : null}

      <CommandPanel
        open={cmdOpen === 'category'}
        onOpenChange={(o) => setCmdOpen(o ? 'category' : null)}
        mode="category"
        items={categories}
        title="انتخاب دسته‌بندی"
        description="موضوعات را مرور یا جستجو کنید"
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
