'use client';

/**
 * ActiveFilters — نوار فیلترهای فعال با انیمیشن حذف
 * ----------------------------------------------------------------------------
 * - هر pill با انیمیشن نرم حذف می‌شه
 * - layout راست‌چین برای RTL
 * - همه‌چی server-friendly (فقط لینک هستن)
 */

import { AnimatePresence, motion } from '@/lib/motion-shim';
import type { TaxonomyType } from '@/types/types';
import { ArrowDownAZ, Filter, FolderOpen, Hash, RotateCcw, Search, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

export type ActiveFilter = {
  type: 'q' | 'category' | 'subcategory' | 'tag' | 'filter';
  label: string;
  href: string;
  icon?: 'search' | 'category' | 'tag' | 'sort';
  /** اگه primary باشه (مثلاً خود دسته‌ی انتخاب‌شده)، رنگ متفاوت می‌گیره */
  variant?: 'primary' | 'accent' | 'default';
};

type Props = {
  filters: ActiveFilter[];
  totalCount: number;
};

const ICONS = {
  search: Search,
  category: FolderOpen,
  tag: Hash,
  sort: ArrowDownAZ,
} as const;

export default function ActiveFilters({ filters, totalCount }: Props) {
  if (filters.length === 0) return null;

  return (
    <div className="arc-active-filters-v3">
      <span className="arc-active-filters-v3__label">
        <Filter className="w-3.5 h-3.5" aria-hidden />
        <span>
          فیلترهای فعال
          <span className="text-neutral-400 dark:text-neutral-500 mx-1">·</span>
          <span className="font-normal">{totalCount.toLocaleString('fa-IR')} نتیجه</span>
        </span>
      </span>

      <AnimatePresence initial={false}>
        {filters.map((f) => {
          const Icon = f.icon ? ICONS[f.icon] : null;
          const variantClass =
            f.variant === 'primary'
              ? 'arc-pill--primary'
              : f.variant === 'accent'
                ? 'arc-pill--accent'
                : '';
          return (
            <motion.div
              key={`${f.type}:${f.label}:${f.href}`}
              initial={{ opacity: 0, scale: 0.85, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -2 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              layout
            >
              <Link
                href={f.href}
                className={`arc-pill ${variantClass}`}
                aria-label={`حذف فیلتر ${f.label}`}
              >
                {Icon ? <Icon className="w-3 h-3" aria-hidden /> : null}
                <span className="max-w-[14rem] truncate">{f.label}</span>
                <span className="arc-pill__remove" aria-hidden>
                  <X className="w-3 h-3" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <Link
        href="/archive"
        className="arc-active-filters-v3__clear"
        aria-label="پاک کردن همه فیلترها"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden />
        <span>پاک کردن همه</span>
      </Link>
    </div>
  );
}
