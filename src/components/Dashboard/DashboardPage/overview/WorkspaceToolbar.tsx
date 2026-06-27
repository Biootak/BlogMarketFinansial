'use client';

/**
 * WorkspaceToolbar — 2026 home-only context bar.
 *
 * Renders only on `/dashboard` (the home canvas). Identity and global
 * utilities (search, theme, avatar, notifications, mobile menu) live on
 * the persistent `Header` (DashboardPage/Header.tsx); the toolbar is
 * strictly for canvas-scoped controls that don't make sense on every
 * page:
 *
 *   • A page-context anchor (eyebrow + title) so the user always knows
 *     they're on the home overview.
 *   • A range segmented control that drives the engagement donut, the
 *     activity rail's filter, and the analytics period (7d / 30d / 90d).
 *   • A density toggle (comfortable / compact) — wired via localStorage.
 *
 * The toolbar is sticky + scroll-aware: once the user scrolls, the
 * context label condenses, padding tightens, and the eyebrow text slides
 * off-canvas.
 *
 * Public API is unchanged from v1: { range, density, onRangeChange,
 * onDensityChange }. DashboardShell does not need to be modified.
 */

import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { HiOutlineRectangleStack, HiOutlineSquares2X2 } from 'react-icons/hi2';

export type Range = 'all' | 'today' | 'week';
export type Density = 'comfortable' | 'compact';

interface WorkspaceToolbarProps {
  range: Range;
  density: Density;
  onRangeChange: (next: Range) => void;
  onDensityChange: (next: Density) => void;
}

const RANGES: ReadonlyArray<{ id: Range; label: string; hint: string }> = [
  { id: 'all', label: 'همه', hint: 'تمام زمان' },
  { id: 'today', label: 'امروز', hint: '۲۴ ساعت اخیر' },
  { id: 'week', label: 'هفتگی', hint: '۷ روز اخیر' },
];

const DENSITIES: ReadonlyArray<{ id: Density; label: string; icon: React.ReactNode }> = [
  { id: 'comfortable', label: 'راحت', icon: <HiOutlineSquares2X2 className="w-3.5 h-3.5" /> },
  { id: 'compact', label: 'فشرده', icon: <HiOutlineRectangleStack className="w-3.5 h-3.5" /> },
];

const DENSITY_STORAGE_KEY = 'dash2:density';
const LEGACY_DENSITY_STORAGE_KEY = 'dashboard:density';

const isDensity = (value: unknown): value is Density =>
  value === 'comfortable' || value === 'compact';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function WorkspaceToolbar({
  range,
  density,
  onRangeChange,
  onDensityChange,
}: WorkspaceToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [, startTransition] = useTransition();

  // ---- Scroll-aware shell -------------------------------------------------
  // A 1px sentinel pinned to the very top is observed via IntersectionObserver;
  // when it leaves the viewport we flip the toolbar into its condensed state.
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setScrolled(entry.intersectionRatio === 0);
      },
      { threshold: [0, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ---- Range segmented: sliding indicator --------------------------------
  // We measure the active button's bounding rect and write --seg-x + --seg-w
  // to the parent. The indicator uses `transform: translateX(var(--seg-x))`
  // so motion happens on the compositor only.
  const segmentRef = useRef<HTMLDivElement | null>(null);
  const segmentBtnRefs = useRef<Partial<Record<Range, HTMLButtonElement | null>>>({});
  useIsomorphicLayoutEffect(() => {
    const parent = segmentRef.current;
    const btn = segmentBtnRefs.current[range];
    if (!parent || !btn) return;
    const measure = () => {
      const parentRect = parent.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const x = btnRect.left - parentRect.left;
      parent.style.setProperty('--seg-x', `${x}px`);
      parent.style.setProperty('--seg-w', `${btnRect.width}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    btn && ro.observe(btn);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [range]);

  // ---- Persist range into URL --------------------------------------------
  const lastWrittenRangeRef = useRef<string | null>(null);
  useEffect(() => {
    const current = search?.get('range') ?? null;
    const desired = range === 'all' ? null : range;
    if (desired === current) {
      lastWrittenRangeRef.current = search?.toString() ?? '';
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

  // ---- Density: hydrate + persist ----------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      let stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
      if (stored === null) {
        const legacy = window.localStorage.getItem(LEGACY_DENSITY_STORAGE_KEY);
        if (legacy !== null) {
          window.localStorage.setItem(DENSITY_STORAGE_KEY, legacy);
          window.localStorage.removeItem(LEGACY_DENSITY_STORAGE_KEY);
          stored = legacy;
        }
      }
      if (stored !== null && isDensity(stored) && stored !== density) {
        onDensityChange(stored);
      }
    } catch {
      // localStorage may be restricted or unavailable; fall back to prop value.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
    } catch {
      // Ignore write failures.
    }
  }, [density]);

  const activeRange = useMemo(() => RANGES.find((r) => r.id === range) ?? RANGES[0], [range]);

  return (
    <div
      role="toolbar"
      aria-label="ابزارهای نمای کلی"
      data-scrolled={scrolled ? 'true' : undefined}
      className={cn('dash-toolbar dash-toolbar--editorial')}
    >
      {/* Sentinel sits above the toolbar; we observe it to derive scrolled */}
      <span ref={sentinelRef} className="dash-toolbar__sentinel" aria-hidden />

      {/* Zone 1 — context (start, RTL: right) ---------------------------- */}
      <div className="dash-toolbar__zone dash-toolbar__zone--context">
        <h2 className="dash-toolbar__title">نمای کلی</h2>
      </div>

      {/* Zone 2 — fluid spacer ------------------------------------------- */}
      <span aria-hidden className="dash-toolbar__spacer" />

      {/* Zone 3 — controls (end, RTL: left) ------------------------------ */}
      <div className="dash-toolbar__zone dash-toolbar__zone--actions">
        {/* Range segmented control with sliding indicator */}
        <div
          ref={segmentRef}
          className="dash-toolbar__segment"
          role="radiogroup"
          aria-label="بازه‌ی داده"
        >
          <span className="dash-toolbar__segment-indicator" aria-hidden />
          {RANGES.map((r) => (
            <button
              key={r.id}
              ref={(el) => {
                segmentBtnRefs.current[r.id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              aria-label={`${r.label} — ${r.hint}`}
              title={r.hint}
              tabIndex={range === r.id ? 0 : -1}
              onClick={() => onRangeChange(r.id)}
              data-active={range === r.id ? 'true' : undefined}
              className="dash-toolbar__segment-btn"
            >
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        {/* Density toggle */}
        <div className="dash-toolbar__density" role="radiogroup" aria-label="چگالی نمایش">
          {DENSITIES.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={density === d.id}
              tabIndex={density === d.id ? 0 : -1}
              onClick={() => onDensityChange(d.id)}
              data-active={density === d.id ? 'true' : undefined}
              title={`چگالی ${d.label}`}
              className="dash-toolbar__density-btn"
            >
              {d.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Screen-reader-only echo of the active range so assistive tech
          gets the same context as the visual segmented control. */}
      <span className="sr-only" aria-live="polite">
        بازه‌ی فعال: {activeRange.label}
      </span>
    </div>
  );
}
