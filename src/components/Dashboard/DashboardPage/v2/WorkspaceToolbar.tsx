'use client';

/**
 * WorkspaceToolbar — 2026 sticky contextual toolbar.
 *
 * Lives at the top of the dashboard canvas. Three slots:
 *   1. A search field (`/`) that mirrors the global ⌘K palette. Pressing
 *      ⌘K or `/` opens the palette; pressing `/` focuses the search.
 *   2. A density toggle (compact / comfortable) — wired through a context
 *      so all panes can read it.
 *   3. Filter chips ("همه" / "امروز" / "هفتگی") that drive the engagement
 *      donut + activity timeline. Selection is persisted in the URL via
 *      `?range=…` so reload / back navigation restore the state.
 *
 * The toolbar is rendered as a `.dash-toolbar` element with a backdrop
 * blur and a thin gradient border. It participates in the .dash-shell
 * container query (collapses to one column under 720px).
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineSquares2X2,
  HiOutlineRectangleStack,
  HiOutlineCommandLine,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

export type Range = 'all' | 'today' | 'week';
export type Density = 'comfortable' | 'compact';

interface WorkspaceToolbarProps {
  range: Range;
  density: Density;
  onRangeChange: (next: Range) => void;
  onDensityChange: (next: Density) => void;
}

const RANGES: { id: Range; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'today', label: 'امروز' },
  { id: 'week', label: 'هفتگی' },
];

const DENSITIES: { id: Density; label: string; icon: React.ReactNode }[] = [
  {
    id: 'comfortable',
    label: 'راحت',
    icon: <HiOutlineSquares2X2 className="w-3.5 h-3.5" />,
  },
  {
    id: 'compact',
    label: 'فشرده',
    icon: <HiOutlineRectangleStack className="w-3.5 h-3.5" />,
  },
];

export default function WorkspaceToolbar({
  range,
  density,
  onRangeChange,
  onDensityChange,
}: WorkspaceToolbarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [query, setQuery] = useState('');
  const [, startTransition] = useTransition();

  // `/` focuses the search field, just like GitHub / Linear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (e.key === '/' && !isTyping && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Persist the range into ?range= so reloads keep state. Skip the write
  // when the URL already agrees, and remember the last value we wrote so
  // we don't churn the URL on subsequent renders.
  const lastWrittenRangeRef = useRef<string | null>(null);
  useEffect(() => {
    const current = search?.get('range') ?? null;
    const desired = range === 'all' ? null : range;
    if (desired === current) {
      lastWrittenRangeRef.current = current;
      return;
    }
    const params = new URLSearchParams(search?.toString() ?? '');
    if (desired) params.set('range', desired);
    else params.delete('range');
    const qs = params.toString();
    if (qs === lastWrittenRangeRef.current) return;
    lastWrittenRangeRef.current = qs;
    startTransition(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    });
  }, [range, search, pathname, router, startTransition]);

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('cmd-palette:open'));
  };

  return (
    <div className="dash-toolbar" role="toolbar" aria-label="ابزارهای داشبورد">
      <label className="dash-toolbar__search" htmlFor="dash-search">
        <HiOutlineMagnifyingGlass className="w-4 h-4 opacity-60 shrink-0" aria-hidden />
        <input
          id="dash-search"
          ref={inputRef}
          className="dash-toolbar__input"
          type="search"
          inputMode="search"
          placeholder="جستجو در داشبورد…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              openPalette();
            }
          }}
          aria-label="جستجو"
        />
        <button
          type="button"
          onClick={openPalette}
          className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/70 rounded-md px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          aria-label="باز کردن جستجوی فرمان‌ها"
        >
          <HiOutlineCommandLine className="w-3 h-3" />
          <span>K</span>
        </button>
      </label>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
          role="radiogroup"
          aria-label="بازه‌ی داده"
        >
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              tabIndex={range === r.id ? 0 : -1}
              onClick={() => onRangeChange(r.id)}
              data-active={range === r.id ? 'true' : undefined}
              className={cn(
                'dash-chip !h-8 !px-3 !text-xs',
                range === r.id ? '!bg-slate-900 !text-white !border-slate-900 dark:!bg-white dark:!text-slate-900 dark:!border-white' : '',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div
          className="hidden sm:inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 ring-1 ring-slate-200/60 dark:ring-slate-700/60"
          role="radiogroup"
          aria-label="چگالی نمایش"
        >
          {DENSITIES.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={density === d.id}
              tabIndex={density === d.id ? 0 : -1}
              onClick={() => onDensityChange(d.id)}
              data-active={density === d.id ? 'true' : undefined}
              className={cn(
                'inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60',
                density === d.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
              )}
            >
              {d.icon}
              <span>{d.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          aria-label="تنظیمات سریع"
        >
          <HiOutlineAdjustmentsHorizontal className="w-4 h-4" />
          <span>تنظیم</span>
        </button>
      </div>
    </div>
  );
}
