'use client';

/**
 * RateListGrid — Linear-issue-card grid of rate lists.
 *
 * Design intent:
 * - Flat cards, no heavy gradients — Linear precision.
 * - Each card = compact data table (header + body + footer).
 * - Hover lift + border accent (subtle, not loud).
 * - "Show more" expands cards in-place.
 *
 * 2026-07-05: rewritten — replaced blue-gradient header with flat title bar.
 */

import { useState } from 'react';
import { parseRateItem } from '@/lib/rateItem';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface Rate {
  title: string;
  value: string | number;
}

interface RateList {
  id: string;
  title: string;
  rates: Rate[];
  isActive: boolean;
  updatedAt: string | Date;
}

interface Props {
  rateLists: RateList[];
  initialCount?: number;
}

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

const isSingleRateList = (rates: Rate[]) => {
  if (rates.length === 0) return true;
  return !rates.some((rate) => String(rate.value).includes('|'));
};

export default function RateListGrid({ rateLists, initialCount = 9 }: Props) {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [expandedCards, setExpandedCards] = useState<Record<string, number>>({});

  const hasMore = displayCount < rateLists.length;
  const perCardDefault = 6;

  const handleExpand = (rateListId: string, total: number) => {
    setExpandedCards((prev) => ({
      ...prev,
      [rateListId]: Math.min(total, (prev[rateListId] || perCardDefault) + 6),
    }));
  };

  if (rateLists.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        لیست نرخی برای نمایش موجود نیست.
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 sm:gap-4 lg:gap-5 ${
        rateLists.length <= 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : rateLists.length === 4
            ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
      }`}
    >
      {rateLists.slice(0, displayCount).map((list) => {
        const isSingle = isSingleRateList(list.rates);
        const shown = expandedCards[list.id] || perCardDefault;
        const hasMoreRates = shown < list.rates.length;
        const rates = list.rates.slice(0, shown);

        return (
          <div key={list.id} className="mt-card">
            {/* Header */}
            <div className="mt-card__header">
              <h3 className="mt-card__title">{list.title}</h3>
              <span className="mt-card__meta">{formatDate(list.updatedAt)}</span>
            </div>

            {/* Body — rows */}
            <div>
              {rates.map((rate, idx) => {
                const parsed = parseRateItem({
                  title: String(rate.title),
                  value: String(rate.value),
                });
                const buy = parsed.buy || '—';
                const sell = parsed.sell || '—';
                return (
                  <div
                    key={`${list.id}-${idx}`}
                    className="px-4 py-2.5 border-b border-slate-100/70 dark:border-slate-800/60 last:border-0"
                  >
                    {isSingle ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                          {rate.title}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                          {buy}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">
                          {rate.title}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="mt-card__rate-value mt-card__rate-value--buy tabular-nums text-sm">
                            {buy}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">
                            /
                          </span>
                          <span className="mt-card__rate-value mt-card__rate-value--sell tabular-nums text-sm">
                            {sell}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-card__footer">
              <span className="mt-card__count">
                <span className="mt-card__count-num">{list.rates.length}</span>
                <span>نرخ</span>
              </span>
              {hasMoreRates ? (
                <button
                  type="button"
                  onClick={() => handleExpand(list.id, list.rates.length)}
                  className="mt-card__action"
                >
                  <span>بیشتر</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              ) : (
                <a
                  href={`/money-transfer?list=${list.id}#contact`}
                  className="mt-card__action"
                >
                  <span>درخواست</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        );
      })}

      {/* Load more button (full-width) */}
      {hasMore && (
        <div className="col-span-full flex justify-center mt-2">
          <button
            type="button"
            onClick={() => setDisplayCount((prev) => prev + 6)}
            className="mt-cta"
            style={{
              background: 'oklch(96% 0.005 240)',
              color: 'oklch(20% 0.015 250)',
              border: '1px solid oklch(90% 0.006 240)',
            }}
          >
            <span>نمایش لیست‌های بیشتر</span>
            <span className="text-xs font-bold opacity-70">
              +{rateLists.length - displayCount}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}