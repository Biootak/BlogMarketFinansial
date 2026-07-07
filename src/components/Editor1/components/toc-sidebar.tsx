// TocSidebar.tsx — Inkwell 2026
// Reading-progress + heading navigation panel for the post editor.
// Mounts alongside <Editor>; receives the items via `onUpdateToC`. Tracks
// the heading currently in view via an IntersectionObserver and uses
// `scrollIntoView({ behavior: 'smooth' })` for navigation. Hidden until
// there is at least one heading.

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, List, X } from 'lucide-react';
import type { TocItem } from '../lib/table-of-contents';
import { cn } from '@/lib/utils';

export interface TocSidebarProps {
  items: TocItem[];
  className?: string;
  /** Highlight threshold (px from top of viewport) — heading wins when its top is above this line. */
  highlightOffset?: number;
  /** Show a dismiss button to collapse the panel — set true if you mount it as a floating island. */
  collapsible?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Converts a heading ID (which may contain spaces, Persian characters,
 * or special symbols) into a valid HTML fragment identifier.
 * Matches the slug generation used by Tiptap's Heading extension.
 */
function slugifyToFragment(id: string): string {
  return id
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // spaces → hyphens
    .replace(/[^\p{L}\p{N}\-_۰-۹۰-۹]/gu, '') // strip non-alphanumeric (keeps Persian chars)
    .replace(/--+/g, '-')          // collapse multiple hyphens
    .replace(/^-|-$/g, '');        // trim leading/trailing hyphens
}

export const TocSidebar: React.FC<TocSidebarProps> = ({
  items,
  className,
  highlightOffset = 96,
  collapsible = false,
  onCollapsedChange,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [progress, setProgress] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track reading progress (top of paper → end).
  useEffect(() => {
    const updateProgress = () => {
      const headingEls = items
        .map((it) => document.getElementById(slugifyToFragment(it.id)))
        .filter((el): el is HTMLElement => !!el);
      if (headingEls.length === 0) {
        setProgress(0);
        return;
      }
      const first = headingEls[0].getBoundingClientRect();
      const last = headingEls[headingEls.length - 1].getBoundingClientRect();
      const top = first.top + window.scrollY;
      const bottom = last.bottom + window.scrollY;
      const scrollY = window.scrollY + highlightOffset;
      const total = Math.max(1, bottom - top);
      const ratio = Math.min(1, Math.max(0, (scrollY - top) / total));
      setProgress(ratio);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [items, highlightOffset]);

  // Highlight the heading closest to the highlight line.
  useEffect(() => {
    observerRef.current?.disconnect();
    if (items.length === 0) return;

    const headingEls = items
      .map((it) => document.getElementById(slugifyToFragment(it.id)))
      .filter((el): el is HTMLElement => !!el);
    if (headingEls.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size === 0) {
          setActiveId((prev) => prev);
          return;
        }
        // The visible heading with the smallest (still negative or smallest
        // positive) top wins — i.e. the one closest above the highlight line.
        let bestId: string | null = null;
        let bestTop = Infinity;
        for (const [id, top] of visible.entries()) {
          // Prefer heading closest to (but above) the highlight line.
          const dist = Math.abs(top - highlightOffset) + (top > highlightOffset ? 1000 : 0);
          if (dist < bestTop) {
            bestTop = dist;
            bestId = id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      { rootMargin: `-${highlightOffset}px 0px -55% 0px`, threshold: [0, 1] },
    );
    for (const el of headingEls) observer.observe(el);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [items, highlightOffset]);

  const handleClick = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const offset = highlightOffset - 16;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    // Update hash without triggering page jump.
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
    setActiveId(id);
  }, [highlightOffset]);

  const handleToggleCollapse = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapsedChange?.(next);
  }, [collapsed, onCollapsedChange]);

  const empty = items.length === 0;
  const displayItems = useMemo(() => items.slice(0, 32), [items]);

  return (
    <aside
      aria-label="فهرست مطالب"
      className={cn('at-toc', collapsed ? 'at-toc--collapsed' : '', className)}
      data-empty={empty || undefined}
    >
      <div className="at-toc__head">
        <span className="at-toc__ico" aria-hidden>
          <List size={14} />
        </span>
        <span className="at-toc__title">فهرست مطالب</span>
        <span className="at-toc__count" aria-label={`${displayItems.length} عنوان`}>
          {displayItems.length.toLocaleString('fa-IR')}
        </span>
        {collapsible && (
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="at-toc__collapse"
            aria-label={collapsed ? 'باز کردن فهرست' : 'بستن فهرست'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronUp size={14} /> : <X size={14} />}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="at-toc__progress" aria-hidden>
            <span
              className="at-toc__progress-bar"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <nav className="at-toc__nav">
            {empty ? (
              <p className="at-toc__empty">
                هنوز عنوانی ندارد. اولین عنوان را در ویراستار اضافه کنید تا فهرست فعال شود.
              </p>
            ) : (
              <ol className="at-toc__list">
                {displayItems.map((item) => (
                  <li
                    key={item.id}
                    className="at-toc__item"
                    data-level={item.level}
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={handleClick(item.id)}
                      className={cn(
                        'at-toc__link',
                        activeId === item.id ? 'is-active' : '',
                      )}
                      aria-current={activeId === item.id ? 'true' : undefined}
                    >
                      <span className="at-toc__rail" aria-hidden />
                      <span className="at-toc__text min-w-0 truncate">{item.text || 'بدون متن'}</span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </nav>
        </>
      )}
    </aside>
  );
};

export default TocSidebar;
