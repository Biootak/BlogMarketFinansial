'use client';

/**
 * CommandPanel — پنل فرمان شگفت‌انگیز برای صفحه آرشیو
 * ----------------------------------------------------------------------------
 * - search داخلی با کیبورد
 * - navigation با ↑/↓/Enter/Esc
 * - shortcut نمایش داده می‌شه
 * - هم برای دسته‌بندی‌ها و هم تگ‌ها استفاده می‌شه
 * - data shape حفظ می‌شه (TaxonomyType[])
 */

import { AnimatePresence, motion } from '@/lib/motion-shim';
import type { TaxonomyType } from '@/types/types';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CornerDownLeft,
  FolderOpen,
  Hash,
  ListFilter,
  Sparkles,
  Tag as TagIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiArrowTrendingUp, HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2';

export type CommandMode = 'category' | 'tag';

export type CommandItem = {
  id: string;
  slug: string;
  name: string;
  count?: number;
  /** extra: توضیح کوتاه یا نام دسته‌ی والد */
  hint?: string;
};

export type CommandPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CommandMode;
  items: TaxonomyType[];
  /** عنوان بالای پنل */
  title: string;
  /** توضیح زیر عنوان */
  description?: string;
  /** slug فعلی انتخاب‌شده (برای highlight) */
  currentSlug?: string;
};

const MODE_META: Record<
  CommandMode,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    accent: string;
    allHref: string;
    allLabel: string;
  }
> = {
  category: {
    icon: FolderOpen,
    iconClass: '',
    accent: '',
    allHref: '/archive',
    allLabel: 'همه مقالات',
  },
  tag: {
    icon: TagIcon,
    iconClass: '--emerald',
    accent: '--emerald',
    allHref: '/archive',
    allLabel: 'همه مقالات',
  },
};

export default function CommandPanel({
  open,
  onOpenChange,
  mode,
  items,
  title,
  description,
  currentSlug,
}: CommandPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const meta = MODE_META[mode];

  const filtered: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = items.map((it) => ({
      id: it.id,
      slug: it.slug,
      name: it.name,
      count: typeof it.count === 'number' ? it.count : undefined,
    }));
    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, query]);

  // ریست کردن وضعیت هنگام باز/بسته شدن
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // فوکوس بعد از mount
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // اسکرول به activeIndex
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const handleSelect = useCallback(
    (slug: string | null) => {
      onOpenChange(false);
      if (slug === null) {
        router.push(meta.allHref);
        return;
      }
      const href = mode === 'category' ? `/archive/category/${slug}` : `/archive/tag/${slug}`;
      router.push(href);
    },
    [mode, meta.allHref, onOpenChange, router],
  );

  // keyboard navigation
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const inSearchInput = target === inputRef.current;
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      // حروف j/k و ArrowUp/Down فقط وقتی focus روی search input نیست کار کنن
      // (تا تایپ "javascript" با j اشتباه گرفته نشه)
      if (e.key === 'ArrowDown' || (e.key === 'j' && !e.shiftKey && !inSearchInput)) {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length));
        return;
      }
      if (e.key === 'ArrowUp' || (e.key === 'k' && !e.shiftKey && !inSearchInput)) {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Home' && !inSearchInput) {
        e.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (e.key === 'End' && !inSearchInput) {
        e.preventDefault();
        setActiveIndex(filtered.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const idx = activeIndex;
        if (idx === 0) {
          handleSelect(null);
        } else {
          const item = filtered[idx - 1];
          if (item) handleSelect(item.slug);
        }
      }
    },
    [activeIndex, filtered, handleSelect, onOpenChange],
  );

  // backdrop close
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onOpenChange(false);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 md:items-center"
          style={{ background: 'oklch(15% 0.012 250 / 0.45)', backdropFilter: 'blur(8px)' }}
          onClick={onBackdropClick}
          onKeyDown={onKeyDown}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="arc-cmd w-full max-w-xl mt-12 md:mt-0"
            // biome-ignore lint/a11y/useSemanticElements: native <dialog> clashes with createPortal + motion exit animations
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onKeyDown={onKeyDown}
          >
            <div className="arc-cmd__head">
              <span className={`arc-cmd__icon${meta.iconClass ? ` ${meta.iconClass}` : ''}`}>
                <meta.icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="arc-cmd__title">{title}</h2>
                {description ? <p className="arc-cmd__sub">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="arc-focus inline-flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="بستن"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="arc-cmd__search">
              <HiOutlineMagnifyingGlass className="arc-cmd__search-icon w-4 h-4" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={mode === 'category' ? 'جستجوی دسته‌بندی…' : 'جستجوی برچسب…'}
                type="text"
                autoComplete="off"
                spellCheck={false}
                aria-label="جستجو"
              />
              <span className="arc-cmd__kbd" aria-hidden>
                <span className="arc-kbd">Esc</span>
              </span>
            </div>

            <div
              ref={listRef}
              className="arc-cmd__list"
              // biome-ignore lint/a11y/useSemanticElements: listbox role with custom <button> children is the ARIA-recommended pattern
              role="listbox"
              tabIndex={-1}
            >
              <div className="arc-cmd__section">
                <div className="arc-cmd__section-title">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  <span>پیشنهاد ویژه</span>
                </div>
                <button
                  type="button"
                  data-idx={0}
                  className="arc-cmd__item"
                  onClick={() => handleSelect(null)}
                  aria-selected={activeIndex === 0}
                  onMouseEnter={() => setActiveIndex(0)}
                >
                  <span className="arc-cmd__item-icon arc-cmd__item-icon--slate">
                    <ListFilter className="w-4 h-4" />
                  </span>
                  <span className="arc-cmd__item-body">
                    <span className="arc-cmd__item-name">{meta.allLabel}</span>
                    <span className="arc-cmd__item-meta">نمایش تمام مقالات بدون فیلتر</span>
                  </span>
                  <span className="arc-cmd__item-trailing">
                    {currentSlug ? null : (
                      <span className="arc-cmd__count" aria-hidden>
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </span>
                </button>
              </div>

              <div className="arc-cmd__section">
                <div className="arc-cmd__section-title">
                  {mode === 'category' ? (
                    <FolderOpen className="w-3.5 h-3.5" aria-hidden />
                  ) : (
                    <Hash className="w-3.5 h-3.5" aria-hidden />
                  )}
                  <span>
                    {mode === 'category' ? 'دسته‌بندی‌ها' : 'برچسب‌ها'}
                    <span className="text-neutral-400 dark:text-neutral-500 mx-1">·</span>
                    <span className="font-normal">
                      {filtered.length.toLocaleString('fa-IR')} مورد
                    </span>
                  </span>
                </div>

                {filtered.length === 0 ? (
                  <div className="arc-cmd__empty">
                    <span className="block mb-2 text-2xl">∅</span>
                    موردی با این جستجو پیدا نشد
                  </div>
                ) : (
                  filtered.map((it, i) => {
                    const isActive = i + 1 === activeIndex;
                    const isCurrent = currentSlug === it.slug;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        data-idx={i + 1}
                        className="arc-cmd__item"
                        onClick={() => handleSelect(it.slug)}
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(i + 1)}
                      >
                        <span
                          className={`arc-cmd__item-icon${meta.iconClass ? ` ${meta.iconClass}` : ''}`}
                        >
                          {mode === 'category' ? (
                            <FolderOpen className="w-4 h-4" />
                          ) : (
                            <Hash className="w-4 h-4" />
                          )}
                        </span>
                        <span className="arc-cmd__item-body">
                          <span className="arc-cmd__item-name">
                            {mode === 'tag' ? `#${it.name}` : it.name}
                          </span>
                          {it.count !== undefined ? (
                            <span className="arc-cmd__item-meta">
                              {it.count.toLocaleString('fa-IR')} مقاله
                            </span>
                          ) : null}
                        </span>
                        <span className="arc-cmd__item-trailing">
                          {isCurrent ? (
                            <span className="arc-cmd__count" aria-label="انتخاب‌شده">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="arc-cmd__count tabular-nums">
                              {typeof it.count === 'number'
                                ? it.count.toLocaleString('fa-IR')
                                : '—'}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="arc-cmd__foot">
              <span className="inline-flex items-center gap-1.5">
                <span className="arc-kbd">
                  <ArrowUp className="w-2.5 h-2.5" />
                </span>
                <span className="arc-kbd">
                  <ArrowDown className="w-2.5 h-2.5" />
                </span>
                <span className="ms-1">پیمایش</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="arc-kbd">
                  <CornerDownLeft className="w-3 h-3" />
                </span>
                <span className="ms-1">انتخاب</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HiArrowTrendingUp className="w-3.5 h-3.5" aria-hidden />
                <span>برای جستجو تایپ کنید</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
