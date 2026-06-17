'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, Rows3 } from 'lucide-react';

export type ArchiveViewMode = 'grid' | 'list';

interface ArchiveViewToggleProps {
  /**
   * Initial view mode. Server-rendered default.
   * Client state overrides it after mount so the user choice persists in this tab.
   */
  initialMode?: ArchiveViewMode;
}

const STORAGE_KEY = 'biotak-archive-view-mode';

/**
 * Compact view-density toggle. Two states: grid (default) / list.
 * When the user switches mode, we add a `data-archive-view="list"` attribute
 * to <html> so the post grid can render the right layout via CSS-only
 * selectors — no need for a re-fetch, no client-side rendering.
 *
 * Why <html> attribute: keeps the rest of the page server-rendered and lets
 * us keep the page.tsx fully server-side. The toggle is the only client
 * component on the page; everything else is RSC.
 */
export default function ArchiveViewToggle({ initialMode = 'grid' }: ArchiveViewToggleProps) {
  const [mode, setMode] = useState<ArchiveViewMode>(initialMode);

  // Hydrate from localStorage on mount (if user previously chose a mode).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ArchiveViewMode | null;
      if (saved === 'grid' || saved === 'list') {
        setMode(saved);
      }
    } catch {
      /* localStorage blocked — keep server default */
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

  return (
    <div
      className="arc-view-toggle"
      role="group"
      aria-label="نحوه نمایش مقالات"
    >
      <button
        type="button"
        className="arc-view-toggle__btn"
        aria-pressed={mode === 'grid'}
        aria-label="نمایش شبکه‌ای"
        title="نمایش شبکه‌ای"
        onClick={() => setMode('grid')}
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
        onClick={() => setMode('list')}
      >
        <Rows3 className="w-4 h-4" aria-hidden />
        <span className="sr-only">فشرده</span>
      </button>
    </div>
  );
}
