'use client';

/**
 * ExchangeRateTableView — نمایش نرخ‌های بازار با گروه‌بندی.
 *
 * Design intent:
 * - ورودی: MarketRateItem[] (مستقیم از assembleMarketRates — بدون تبدیل به ExchangeRateData)
 * - گروه‌بندی: Afghan → Iran-Forex → Gold/Coin → Minor
 * - هر ردیف: نام فارسی + نرخ با واحد + درصد تغییر واقعی از TGJU
 * - برای نرخ‌های دوطرفه (BUY_SELL) خرید/فروش هم نمایش داده می‌شود
 * - tabular-nums روی همه اعداد (Linear precision)
 *
 * 2026-07: rewritten from ExchangeRateData to MarketRateItem — removes the
 * /IRT hardcode and exposes changePercent from TGJU.
 */

import type { MarketRateGroup, MarketRateItem } from '@/lib/market-rates';
import { formatChangePercent, formatWithUnit } from '@/lib/market-rates/format';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
  rates: MarketRateItem[];
}

// ترتیب و برچسب گروه‌ها (اولویت‌دار برای سایت افغانستان)
const GROUP_ORDER: MarketRateGroup[] = [
  'afghan',
  'iran-forex',
  'iran-gold',
  'iran-coin',
  'global',
  'minor',
];
const GROUP_LABELS: Record<string, string> = {
  afghan: 'ارزهای افغانستان',
  'iran-forex': 'ارز آزاد ایران',
  'iran-gold': 'طلای ایران',
  'iran-coin': 'سکه',
  global: 'بازار جهانی',
  minor: 'ارز جزئی',
};

interface TabId {
  id: MarketRateGroup | 'all';
  label: string;
  count: number;
}

export function ExchangeRateTableView({ rates }: Props) {
  // فقط آیتم‌های معتبر
  const valid = rates.filter((r) => Number.isFinite(r.value) && r.value > 0);

  // محاسبه تب‌ها بر اساس گروه‌های موجود
  const groupCounts = new Map<MarketRateGroup, number>();
  for (const r of valid) {
    groupCounts.set(r.group, (groupCounts.get(r.group) ?? 0) + 1);
  }

  const tabs: TabId[] = [
    { id: 'all', label: 'همه', count: valid.length },
    ...GROUP_ORDER.filter((g) => (groupCounts.get(g) ?? 0) > 0).map((g) => ({
      id: g as MarketRateGroup | 'all',
      label: GROUP_LABELS[g] ?? g,
      count: groupCounts.get(g) ?? 0,
    })),
  ];

  const [activeTab, setActiveTab] = useState<MarketRateGroup | 'all'>('all');

  const displayed =
    activeTab === 'all'
      ? [...valid].sort((a, b) => a.priority - b.priority)
      : valid.filter((r) => r.group === activeTab).sort((a, b) => a.priority - b.priority);

  if (valid.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        نرخی برای نمایش موجود نیست.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">نرخ بازار</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {displayed.length} مورد
        </span>
      </div>

      {/* Tabs — گروه‌بندی */}
      {tabs.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'true' : undefined}
              className={['mt-tab', activeTab === tab.id ? 'mt-tab--active' : '']
                .filter(Boolean)
                .join(' ')}
            >
              {tab.label}
              <span className="ms-1 opacity-60 tabular-nums text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Table — از کلاس‌های CSS به‌جای role attributes استفاده می‌کند */}
      <div className="mt-table" aria-label="جدول نرخ ارز">
        {/* Header row */}
        <div className="mt-table__header">
          <div className="mt-table__header-row">
            <div className="mt-table__head">
              <span>ارز</span>
            </div>
            <div className="mt-table__head mt-table__head--num">
              <span>نرخ</span>
            </div>
            <div className="mt-table__head mt-table__head--num">
              <span>تغییر</span>
            </div>
            <div className="mt-table__head mt-table__head--num hidden md:inline-flex">
              <span>نوع</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div>
          {displayed.map((rate) => {
            const isUp = rate.changePercent >= 0;
            const changeFmt = formatChangePercent(rate.changePercent);

            return (
              <div key={rate.symbol} className="mt-table__row">
                {/* Currency name */}
                <div className="mt-table__currency">
                  <span
                    className={`mt-table__status${isUp ? '' : ' mt-table__status--amber'}`}
                    aria-hidden
                    title={isUp ? 'صعودی' : 'نزولی'}
                  />
                  <div className="mt-table__name">
                    <span className="mt-table__name-title">{rate.displayNameFa}</span>
                    <span className="mt-table__name-code">
                      {rate.symbol.replace(/^(?:IRAN|AFGHANI|GLOBAL)_/, '')}
                    </span>
                  </div>
                </div>

                {/* Rate — با واحد درست */}
                <div className="mt-table__price">
                  <span className="mt-table__price-val" dir="ltr">
                    {formatWithUnit(rate.value, rate.unit, rate.decimals)}
                  </span>
                </div>

                {/* Change percent — واقعی از TGJU */}
                <div className="mt-table__price">
                  <span
                    className={[
                      'mt-table__price-delta',
                      isUp ? 'mt-table__price-delta--up' : 'mt-table__price-delta--down',
                    ].join(' ')}
                    dir="ltr"
                    aria-label={`تغییر ${changeFmt}`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-3 h-3 shrink-0" aria-hidden />
                    ) : (
                      <TrendingDown className="w-3 h-3 shrink-0" aria-hidden />
                    )}
                    {changeFmt}
                  </span>
                </div>

                {/* Group label (desktop) */}
                <div className="mt-table__desc hidden md:flex">
                  {GROUP_LABELS[rate.group] ?? rate.group}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
