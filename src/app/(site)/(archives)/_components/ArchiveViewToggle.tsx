'use client';

import { LayoutGrid, Rows3 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export type ArchiveViewMode = 'grid' | 'list';

interface ArchiveViewToggleProps {
  /**
   * Initial view mode. Server-rendered default.
   * Client state overrides it after mount so the user choice persists in this tab.
   */
  initialMode?: ArchiveViewMode;
}

const STORAGE_KEY = 'biotak-archive-view-mode';
const URL_PARAM = 'view';

/**
 * Compact view-density toggle. Two states: grid (default) / list.
 * When the user switches mode, we add a `data-archive-view="list"` attribute
 * to <html> so the post grid can render the right layout via CSS-only
 * selectors — no need for a re-fetch, no client-side rendering.
 *
 * Persistence:
 *  - URL (`?view=grid|list`) — shareable, server-readable, highest priority
 *  - localStorage — tab-local fallback
 *
 * Why <html> attribute: keeps the rest of the page server-rendered and lets
 * us keep the page.tsx fully server-side. The toggle is the only client
 * component on the page; everything else is RSC.
 */
export default function ArchiveViewToggle({ initialMode = 'grid' }: ArchiveViewToggleProps) {
  const [mode, setMode] = useState<ArchiveViewMode>(initialMode);

  // Hydrate from URL or localStorage on mount (URL wins, then localStorage, then prop).
  useEffect(() => {
    try {
      const urlMode = new URLSearchParams(window.location.search).get(URL_PARAM);
      if (urlMode === 'grid' || urlMode === 'list') {
        setMode(urlMode);
        return;
      }
      const saved = window.localStorage.getItem(STORAGE_KEY) as ArchiveViewMode | null;
      if (saved === 'grid' || saved === 'list') {
        setMode(saved);
      }
    } catch {
      /* storage blocked — keep server default */
    }
  }, []);

  // Reflect mode on <html> so CSS can switch layouts without re-rendering.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.archiveView = mode;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore quota errors */
    }
  }, [mode]);

  // به‌روزرسانی URL با replaceState (بدون اسکرول، بدون history entry اضافه)
  const syncUrl = useCallback((next: ArchiveViewMode) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (next === 'grid') {
      // پاک کردن پارامتر وقتی به حالت پیش‌فرض برمی‌گردیم (URL تمیز بمونه)
      url.searchParams.delete(URL_PARAM);
    } else {
      url.searchParams.set(URL_PARAM, next);
    }
    const newPath = url.pathname + (url.search ? url.search : '') + url.hash;
    window.history.replaceState(null, '', newPath);
  }, []);

  const handleSet = (next: ArchiveViewMode) => {
    if (next === mode) return;
    setMode(next);
    syncUrl(next);
  };

  return (
    <div
      className="arc-view-toggle"
      // biome-ignore lint/a11y/useSemanticElements: role="group" is the ARIA-recommended way to group toolbar buttons outside a form
      role="group"
      aria-label="نحوه نمایش مقالات"
    >
      <button
        type="button"
        className="arc-view-toggle__btn"
        aria-pressed={mode === 'grid'}
        aria-label="نمایش شبکه‌ای"
        title="نمایش شبکه‌ای"
        onClick={() => handleSet('grid')}
      >
        <LayoutGrid className="w-4 h-4" aria-hidden />
        <span className="sr-only">شبکه‌ای</span>
      </button>
      <button
        type="button"
        className="arc-view-toggle__btn"
        aria-pressed={mode === 'list'}
        aria-label="نمایش فشرده"
        title="نمایش فشرده"
        onClick={() => handleSet('list')}
      >
        <Rows3 className="w-4 h-4" aria-hidden />
        <span className="sr-only">فشرده</span>
      </button>
    </div>
  );
}
