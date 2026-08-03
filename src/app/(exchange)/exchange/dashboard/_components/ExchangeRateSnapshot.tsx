/**
 * ExchangeRateSnapshot — مینی‌کارت‌هایی برای نمایش نرخ فعال.
 *
 * Server Component. هر کارت = 1 نرخ.
 * چیدمان: ۲ کارت در هر ردیف، در دسکتاپ ۳ کارت.
 */

import type { RateSnapshot } from '@/actions/exchange-dashboard';
import { ArrowLeftRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import s from './ExchangeDashboard.module.css';

function formatNumber(value: string, decimals: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

function formatRate(rate: RateSnapshot): { primary: string; secondary: string | null } {
  if (rate.rateType === 'SINGLE_BULK' && rate.singleRate) {
    return { primary: formatNumber(rate.singleRate, rate.decimals), secondary: null };
  }
  if (rate.buyRate && rate.sellRate) {
    const buy = formatNumber(rate.buyRate, rate.decimals);
    const sell = formatNumber(rate.sellRate, rate.decimals);
    return { primary: buy, secondary: sell };
  }
  if (rate.sellRate) {
    return { primary: formatNumber(rate.sellRate, rate.decimals), secondary: null };
  }
  if (rate.buyRate) {
    return { primary: formatNumber(rate.buyRate, rate.decimals), secondary: null };
  }
  return { primary: '—', secondary: null };
}

export default function ExchangeRateSnapshot({ items }: { items: RateSnapshot[] }) {
  if (items.length === 0) {
    return <div className={s.flowEmpty}>نرخ فعالی برای نمایش وجود ندارد.</div>;
  }

  return (
    <div>
      <div className={s.rateGrid} role="list">
        {items.map((r) => {
          const { primary, secondary } = formatRate(r);
          return (
            <div key={r.id} role="listitem" className={s.rateCard}>
              <div className={s.rateHead}>
                <span className={s.rateCurrency} dir="ltr">
                  {r.currency}
                </span>
                <span className={s.rateName}>{r.displayNameFa ?? r.name}</span>
              </div>
              <div className={s.rateValues}>
                <span className={s.ratePrimary} dir="ltr">
                  {primary}
                </span>
                {secondary && (
                  <span className={s.rateSecondary} dir="ltr">
                    <ArrowLeftRight size={10} aria-hidden />
                    {secondary}
                  </span>
                )}
              </div>
              {r.unit && (
                <span className={s.rateUnit} dir="ltr">
                  {r.unit}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className={s.weekFooter} style={{ marginTop: 'var(--ds-space-4)' }}>
        <span>۶ نرخ فعال</span>
        <Link href="/exchange/rates" className={s.panelLink}>
          مشاهده همه
          <ChevronLeft size={12} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
