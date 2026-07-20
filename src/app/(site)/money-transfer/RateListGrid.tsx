'use client';

/**
 * RateListGrid — premium rate-list card grid.
 *
 * Design: depth + motion choreography (staggered enter) + typed column alignment.
 * Three live lists from webscraper: SANA (buy/sell تومان) + TRANSFER (تومان) + SARA (AFN از sarafi.af).
 * DB rateLists merged on top without duplicates.
 */

import type { MarketRateItem } from '@/lib/market-rates';
import { formatWithUnit } from '@/lib/market-rates/format';
import { parseRateItem } from '@/lib/rateItem';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import s from './RateListGrid.module.css';

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
  /** آیتم‌های زنده از WebScraper — همیشه نمایش داده می‌شود (کنار rateLists DB) */
  liveRates?: MarketRateItem[];
  initialCount?: number;
}

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const isSingleRateList = (rates: Rate[]) => {
  if (rates.length === 0) return true;
  return !rates.some((rate) => String(rate.value).includes('|'));
};

/** حذف prefix شناخته‌شده از displayNameFa */
function shortName(name: string, prefix: string): string {
  return name.startsWith(prefix) ? name.slice(prefix.length).trim() : name;
}

/** data-variant برای CSS ring pseudo-element */
function cardVariant(id: string): string {
  if (id.includes('sana')) return 'sana';
  if (id.includes('transfer')) return 'transfer';
  if (id.includes('sara')) return 'sara';
  return 'default';
}

/**
 * تبدیل MarketRateItem[] به سه لیست:
 *   1. صرافی ملی (SANA_ buy+sell تومان)
 *   2. نرخ حواله (TRANSFER_ تک‌نرخی تومان)
 *   3. سرای شاهزاده (SARA_ buy+sell افغانی از sarafi.af)
 */
function buildLiveRateLists(items: MarketRateItem[]): RateList[] {
  const makePairRow = (r: MarketRateItem, namePrefix = ''): Rate => {
    const buy =
      r.buyValue != null ? formatWithUnit(r.buyValue / r.divisor, r.unit, r.decimals) : '—';
    const sell =
      r.sellValue != null ? formatWithUnit(r.sellValue / r.divisor, r.unit, r.decimals) : '—';
    return { title: shortName(r.displayNameFa, namePrefix), value: `${buy}|${sell}` };
  };
  const makeSingleRow = (r: MarketRateItem, namePrefix = ''): Rate => ({
    title: shortName(r.displayNameFa, namePrefix),
    value: formatWithUnit(r.value, r.unit, r.decimals),
  });

  const now = new Date();

  const sanaItems = items
    .filter(
      (r) =>
        r.symbol.startsWith('SANA_') && (r.buyValue != null || r.sellValue != null) && r.value > 0,
    )
    .sort((a, b) => a.priority - b.priority);

  const transferItems = items
    .filter((r) => r.symbol.startsWith('TRANSFER_') && Number.isFinite(r.value) && r.value > 0)
    .sort((a, b) => a.priority - b.priority);

  const saraItems = items
    .filter(
      (r) =>
        r.symbol.startsWith('SARA_') && (r.buyValue != null || r.sellValue != null) && r.value > 0,
    )
    .sort((a, b) => a.priority - b.priority);

  const lists: RateList[] = [];

  if (sanaItems.length > 0) {
    lists.push({
      id: 'live-sana',
      title: 'صرافی ملی',
      isActive: true,
      updatedAt: sanaItems[0]?.updatedAt ?? now,
      rates: sanaItems.map((r) => makePairRow(r, 'صرافی ملی ')),
    });
  }

  if (transferItems.length > 0) {
    lists.push({
      id: 'live-transfer',
      title: 'نرخ حواله',
      isActive: true,
      updatedAt: transferItems[0]?.updatedAt ?? now,
      rates: transferItems.map((r) => makeSingleRow(r, 'حواله ')),
    });
  }

  if (saraItems.length > 0) {
    lists.push({
      id: 'live-sara',
      title: 'سرای شاهزاده',
      isActive: true,
      updatedAt: saraItems[0]?.updatedAt ?? now,
      rates: saraItems.map((r) => makePairRow(r, 'سرای شاهزاده ')),
    });
  }

  return lists;
}

/** یک کارت مجزا با state داخلی — expand فقط این کارت را re-render می‌کند */
function RateCard({ list, cardIdx }: { list: RateList; cardIdx: number }) {
  const perCardDefault = 6;
  const [shown, setShown] = useState(perCardDefault);
  const isSingle = isSingleRateList(list.rates);
  const hasMoreRates = shown < list.rates.length;
  const rates = list.rates.slice(0, shown);

  return (
    <div
      className={s.card}
      data-variant={cardVariant(list.id)}
      style={{ '--stagger-delay': `${cardIdx * 55}ms` } as React.CSSProperties}
    >
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <span className={s.liveDot} aria-label="زنده" />
          <h3 className={s.title}>{list.title}</h3>
        </div>
        <span className={s.dateBadge}>{formatDate(list.updatedAt)}</span>
      </div>

      {/* Column subheader (فقط برای کارت‌های دوطرفه) */}
      {!isSingle && (
        <div className={s.colHeader} aria-hidden>
          <span className={s.colHeaderLabel}>ارز</span>
          <div className={s.colHeaderPair}>
            <span className={s.colBuy}>خرید</span>
            <span className={s.colSell}>فروش</span>
          </div>
        </div>
      )}

      {/* Body — rows */}
      <div>
        {rates.map((rate, idx) => {
          const parsed = parseRateItem({
            title: String(rate.title),
            value: String(rate.value),
          });
          const buy = parsed.buy ?? '—';
          const sell = parsed.sell;
          return (
            <div key={`${list.id}-${idx}`} className={s.row}>
              <span className={s.rowName}>{rate.title}</span>
              {isSingle ? (
                <span className={s.rowValue}>{buy}</span>
              ) : (
                <div className={s.rowPair}>
                  <span className={s.buyVal}>{buy}</span>
                  <span className={s.divider} aria-hidden>
                    |
                  </span>
                  <span className={s.sellVal}>{sell ?? '—'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={s.footer}>
        <span className={s.footerCount}>
          <span className={s.footerCountNum}>{list.rates.length}</span>
          <span>نرخ</span>
        </span>
        {hasMoreRates ? (
          <button
            type="button"
            onClick={() => setShown((prev) => Math.min(list.rates.length, prev + 6))}
            className={s.footerAction}
          >
            <span>بیشتر</span>
            <ChevronDown className="w-3 h-3" aria-hidden />
          </button>
        ) : (
          <a href={`/money-transfer?list=${list.id}#contact`} className={s.footerAction}>
            <span>درخواست</span>
            <ArrowLeft className="w-3 h-3" aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}

export default function RateListGrid({ rateLists, liveRates, initialCount = 9 }: Props) {
  const [displayCount, setDisplayCount] = useState(initialCount);

  const liveLists = liveRates && liveRates.length > 0 ? buildLiveRateLists(liveRates) : [];
  const dbIds = new Set(rateLists.map((l) => l.id));
  const effectiveLists = [...rateLists, ...liveLists.filter((l) => !dbIds.has(l.id))];

  // فقط کارت‌هایی که rates دارند
  const visibleLists = effectiveLists.filter((l) => l.rates.length > 0);
  const hasMore = displayCount < visibleLists.length;

  if (visibleLists.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        لیست نرخی برای نمایش موجود نیست.
      </div>
    );
  }

  return (
    <div className={s.grid}>
      {visibleLists.slice(0, displayCount).map((list, cardIdx) => (
        <RateCard key={list.id} list={list} cardIdx={cardIdx} />
      ))}

      {/* Load more */}
      {hasMore && (
        <div className="col-span-full flex justify-center mt-2">
          <button
            type="button"
            onClick={() => setDisplayCount((prev) => prev + 6)}
            className={s.loadMore}
          >
            <span>نمایش لیست‌های بیشتر</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, opacity: 0.65 }}>
              +{effectiveLists.length - displayCount}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
