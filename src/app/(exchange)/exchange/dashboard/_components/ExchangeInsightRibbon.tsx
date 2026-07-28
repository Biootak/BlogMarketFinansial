/**
 * ExchangeInsightRibbon — چهار insight callout کنار هم.
 *
 * هر callout یک نکتهٔ جالب از داده‌های روز را برجسته می‌کند:
 *   - «ارز غالب ۳۰ روز» — بر اساس currencyFlow
 *   - «مشتری فعال ۳۰ روز» — top customer
 *   - «اوج هفته» — از weeklyRhythm
 *   - «ارز اصلی» — primary currency صراف
 *
 * Server Component. ساده و سریع.
 */

import { Sparkles, TrendingUp, Award, Clock } from 'lucide-react';
import s from './ExchangeDashboard.module.css';
import type {
  CurrencyFlow,
  DailyPoint,
  TopCustomer,
} from '@/actions/exchange-dashboard';

function formatCompact(volumeStr: string): string {
  const minor = BigInt(volumeStr);
  return new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(minor) / 100);
}

function formatFaNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

interface Props {
  currencyFlow: CurrencyFlow[];
  topCustomers: TopCustomer[];
  weeklyRhythm: DailyPoint[];
  primaryCurrency: string;
}

export default function ExchangeInsightRibbon({
  currencyFlow,
  topCustomers,
  weeklyRhythm,
  primaryCurrency,
}: Props) {
  // Insight 1: dominant currency
  const dominant = currencyFlow[0];

  // Insight 2: top customer
  const champion = topCustomers[0];

  // Insight 3: peak day
  const peakDay = weeklyRhythm.reduce(
    (best, d) => (d.count > best.count ? d : best),
    weeklyRhythm[0] ?? { count: 0, weekdayFa: '—', dayLabel: '', offset: 0 },
  );

  const hasData = Boolean(dominant || champion || peakDay.count > 0);

  if (!hasData) {
    return (
      <div className={s.insightEmpty}>
        برای نمایش insight نیاز به دادهٔ بیشتری است.
      </div>
    );
  }

  return (
    <div className={s.insightRibbon} role="list">
      {dominant && (
        <div role="listitem" className={s.insightItem} data-accent="emerald">
          <div className={s.insightIcon} aria-hidden>
            <TrendingUp size={14} strokeWidth={1.75} />
          </div>
          <div className={s.insightBody}>
            <div className={s.insightLabel}>ارز غالب ۳۰ روز</div>
            <div className={s.insightValue} dir="ltr">
              {dominant.currency}
            </div>
            <div className={s.insightSub}>
              <span dir="ltr">{formatCompact(dominant.volume)}</span> حجم ·{' '}
              <span dir="ltr">{formatFaNumber(dominant.count)}</span> تراکنش
            </div>
          </div>
        </div>
      )}

      {champion && champion.txnCount > 0 && (
        <div role="listitem" className={s.insightItem} data-accent="amber">
          <div className={s.insightIcon} aria-hidden>
            <Award size={14} strokeWidth={1.75} />
          </div>
          <div className={s.insightBody}>
            <div className={s.insightLabel}>مشتری فعال ۳۰ روز</div>
            <div className={s.insightValue} title={champion.fullName}>
              {champion.fullName}
            </div>
            <div className={s.insightSub}>
              <span dir="ltr">{formatFaNumber(champion.txnCount)}</span> تراکنش
            </div>
          </div>
        </div>
      )}

      {peakDay.count > 0 && (
        <div role="listitem" className={s.insightItem} data-accent="sky">
          <div className={s.insightIcon} aria-hidden>
            <Clock size={14} strokeWidth={1.75} />
          </div>
          <div className={s.insightBody}>
            <div className={s.insightLabel}>اوج هفته</div>
            <div className={s.insightValue}>
              {peakDay.weekdayFa} <span dir="ltr">{peakDay.dayLabel}</span>
            </div>
            <div className={s.insightSub}>
              <span dir="ltr">{formatFaNumber(peakDay.count)}</span> تراکنش در یک روز
            </div>
          </div>
        </div>
      )}

      <div role="listitem" className={s.insightItem} data-accent="violet">
        <div className={s.insightIcon} aria-hidden>
          <Sparkles size={14} strokeWidth={1.75} />
        </div>
        <div className={s.insightBody}>
          <div className={s.insightLabel}>ارز اصلی</div>
          <div className={s.insightValue} dir="ltr">
            {primaryCurrency}
          </div>
          <div className={s.insightSub}>واحد پایهٔ آمارها</div>
        </div>
      </div>
    </div>
  );
}
