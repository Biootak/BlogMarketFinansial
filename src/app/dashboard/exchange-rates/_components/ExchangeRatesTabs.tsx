'use client';

/**
 * ExchangeRatesTabs — 2026 segmented tab bar for the merged page.
 *
 * Two views:
 *   • market  → ExchangeRate registry (TGJU/manual)
 *   • lists   → RateList custom lists for ticker strips
 *
 * Sliding indicator driven by CSS variables from measured active button.
 * Uses logical (inset-inline-start) properties for RTL safety.
 */

import { cn } from '@/lib/utils';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type ExchangeRatesTab = 'market' | 'lists';

interface Props {
  value: ExchangeRatesTab;
  onChange: (tab: ExchangeRatesTab) => void;
  marketCount?: number;
  listsCount?: number;
}

const TABS: { id: ExchangeRatesTab; label: string }[] = [
  { id: 'market', label: 'نرخ‌های بازار' },
  { id: 'lists', label: 'لیست‌های نرخ' },
];

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function ExchangeRatesTabs({
  value: activeTab,
  onChange: onTabChange,
  marketCount,
  listsCount,
}: Props) {
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
    // In RTL, `inset-inline-start` resolves to the right edge, so the
    // distance must be measured from the right (not the left). In LTR
    // we measure from the left as usual.
    const isRtl = getComputedStyle(root).direction === 'rtl';
    const x = isRtl ? rootRect.right - btnRect.right : btnRect.left - rootRect.left;
    setIndicator({
      x,
      width: btnRect.width,
      opacity: 1,
    });
  }, [activeTab]);

  const counts: Record<ExchangeRatesTab, number | undefined> = {
    market: marketCount,
    lists: listsCount,
  };

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
          insetInlineStart: indicator.x,
          width: indicator.width,
          opacity: indicator.opacity,
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border-default)',
          boxShadow: 'var(--ds-shadow-sm)',
          transition:
            'inset-inline-start 220ms var(--ds-ease-out-expo), width 180ms var(--ds-ease-out-expo), opacity 120ms ease-out',
        }}
      />
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];
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
            style={{ borderRadius: 'calc(var(--ds-radius-md) - 2px)', gap: '0.4rem' }}
          >
            {tab.label}
            {typeof count === 'number' && (
              <span
                className="inline-flex items-center justify-center tabular-nums"
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  minWidth: '1.5rem',
                  height: '1.2rem',
                  paddingInline: '0.35rem',
                  borderRadius: 'var(--ds-radius-full)',
                  background: isActive
                    ? 'color-mix(in oklch, var(--ds-brand-500) 14%, transparent)'
                    : 'var(--ds-canvas)',
                  color: isActive ? 'var(--ds-brand-500)' : 'var(--ds-text-muted)',
                  border: '1px solid var(--ds-border-subtle)',
                }}
                aria-label={`تعداد ${count.toLocaleString('fa-IR')} مورد`}
              >
                {count.toLocaleString('fa-IR')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
