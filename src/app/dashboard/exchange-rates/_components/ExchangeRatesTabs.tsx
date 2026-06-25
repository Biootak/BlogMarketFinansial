'use client';

/**
 * ExchangeRatesTabs — 2026 segmented tab bar for the merged page.
 *
 * Two views:
 *   • market  → ExchangeRate registry (TGJU/manual)
 *   • lists   → RateList custom lists for ticker strips
 *
 * URL-persisted (?tab=market|lists) so reload / share / back work.
 * Sliding indicator driven by CSS variables from measured active button.
 */

import { cn } from '@/lib/utils';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type ExchangeRatesTab = 'market' | 'lists';

interface Props {
  activeTab: ExchangeRatesTab;
  onTabChange: (tab: ExchangeRatesTab) => void;
}

const TABS: { id: ExchangeRatesTab; label: string }[] = [
  { id: 'market', label: 'نرخ‌های بازار' },
  { id: 'lists', label: 'لیست‌های نرخ' },
];

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function ExchangeRatesTabs({ activeTab, onTabChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Partial<Record<ExchangeRatesTab, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState({ x: 0, width: 0, opacity: 0 });

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const activeBtn = btnRefs.current[activeTab];
    if (!root || !activeBtn) {
      setIndicator((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setIndicator({
      x: btnRect.left - rootRect.left,
      width: btnRect.width,
      opacity: 1,
    });
  }, [activeTab]);

  return (
    <div
      ref={rootRef}
      className="relative inline-flex items-center"
      role="tablist"
      aria-label="بخش‌های نرخ"
      style={{
        background: 'var(--ds-canvas-subtle)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-md)',
        padding: '0.25rem',
        gap: '0.25rem',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-md"
        style={{
          left: indicator.x,
          width: indicator.width,
          opacity: indicator.opacity,
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-default)',
          boxShadow: 'var(--ds-shadow-sm)',
          transition:
            'left 220ms var(--ds-ease-out-expo), width 180ms var(--ds-ease-out-expo), opacity 120ms ease-out',
        }}
      />
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              btnRefs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`exchange-rates-tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative z-10 inline-flex items-center justify-center px-4 py-1.5 text-sm font-semibold transition-colors',
              isActive
                ? 'text-[var(--ds-text-primary)]'
                : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text-secondary)]',
            )}
            style={{ borderRadius: 'calc(var(--ds-radius-md) - 2px)' }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
