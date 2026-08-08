'use client';

/**
 * AtelierToolbar — the archive command bar (2026).
 * A single sticky glass capsule: live search, sort segments, and category/tag
 * command panels. Behaviour (debounced search, ⌘K / "/" shortcuts) is reused
 * from the existing archive primitives; only the presentation is new.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaxonomyType } from '@/types/types';
import {
  ArrowDownAZ,
  ArrowUpDown,
  Check,
  Clock3,
  Flame,
  FolderOpen,
  Hash,
  History,
  LayoutGrid,
  ListFilter,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { ActiveFilter } from './ActiveFilters';
import ArchiveSearchInput, { ARCHIVE_SEARCH_INPUT_ID } from './ArchiveSearchInput';
import CommandPanel from './CommandPanel';
import CommandTrigger from './CommandTrigger';

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

// آیکون معنایی هر حالت مرتب‌سازی — در دراپ‌داون فیلتر نمایش داده می‌شود.
const SORT_ICONS = {
  'همه مقالات': LayoutGrid,
  جدیدترین: Clock3,
  قدیمی‌ترین: History,
  محبوب‌ترین: Flame,
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

          {/* 2026-08-08: فیلتر مرتب‌سازی به‌صورت دراپ‌داون آیکون‌دار —
              در موبایل یک دکمهٔ فشرده به‌جای ۴ تب پهن */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="atl-filter-trigger"
                aria-label={`مرتب‌سازی: ${initialFilter}`}
              >
                <ListFilter className="w-4 h-4" aria-hidden />
                <span className="atl-filter-trigger__label">{initialFilter}</span>
                <ArrowUpDown className="w-3.5 h-3.5 opacity-50" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="w-48">
              {filters.map((f) => {
                const isActive = initialFilter === f.name;
                const SortIcon = SORT_ICONS[f.name as keyof typeof SORT_ICONS] ?? ArrowUpDown;
                return (
                  <DropdownMenuItem
                    key={f.name}
                    onClick={() => setFilter(f.name)}
                    className="gap-2"
                  >
                    <SortIcon className="w-4 h-4 opacity-70" aria-hidden />
                    <span className="flex-1">{f.name}</span>
                    {isActive ? <Check className="w-4 h-4 text-primary" aria-hidden /> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="atl-active" style={{ marginTop: 'var(--ds-space-4)' }}>
          <span className="atl-active__label">{totalCount.toLocaleString('fa-IR')} نتیجه برای</span>
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
