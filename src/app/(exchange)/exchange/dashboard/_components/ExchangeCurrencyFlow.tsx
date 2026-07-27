/**
 * ExchangeCurrencyFlow — horizontal lanes for top 5 currencies by volume.
 *
 * Server Component — داده از قبل aggregate شده (CurrencyFlow[]).
 * هر lane یک bar با relative scaling (نسبت به بزرگ‌ترین).
 * بدون chart-lib — فقط CSS transform.
 */

import { Banknote, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import s from './ExchangeDashboard.module.css';
import type { CurrencyFlow } from '@/actions/exchange-dashboard';

function formatAmount(volumeStr: string): string {
  const minor = BigInt(volumeStr);
  return new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(minor) / 100,
  );
}

export default function ExchangeCurrencyFlow({
  items,
  primaryCurrency,
}: {
  items: CurrencyFlow[];
  primaryCurrency: string;
}) {
  if (items.length === 0) {
    return (
      <div className={s.flowEmpty}>
        هنوز تراکنشی برای نمایش جریان ارزها ثبت نشده است.
      </div>
    );
  }

  const maxVolume = items.reduce(
    (m, it) => Math.max(m, Number(BigInt(it.volume))),
    1,
  );

  return (
    <div>
      <div className={s.flowList} role="list">
        {items.map((it, idx) => {
          const widthPct = maxVolume > 0
            ? Math.max(8, Math.round((Number(BigInt(it.volume)) / maxVolume) * 100))
            : 8;
          const isPrimary = it.currency === primaryCurrency;
          return (
            <div key={it.currency} role="listitem" className={s.flowRow}>
              <span className={s.flowCurrency} dir="ltr">
                {it.currency}
                {isPrimary && (
                  <span
                    aria-hidden
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--at-accent)',
                      marginInlineStart: 6,
                    }}
                  />
                )}
              </span>
              <div className={s.flowBarWrap} aria-hidden>
                <div
                  className={s.flowBar}
                  data-index={idx}
                  style={{
                    insetInlineStart: 0,
                    insetInlineEnd: `${100 - widthPct}%`,
                  }}
                />
              </div>
              <span className={s.flowAmount} dir="ltr">
                {formatAmount(it.volume)}
              </span>
            </div>
          );
        })}
      </div>
      <div className={s.weekFooter} style={{ marginTop: 'var(--ds-space-4)' }}>
        <span>۳۰ روز اخیر · {items.length} ارز فعال</span>
        <Link href="/exchange/rates" className={s.panelLink}>
          مدیریت نرخ‌ها
          <ChevronLeft size={12} aria-hidden style={{ transform: 'scaleX(-1)' }} />
        </Link>
      </div>
    </div>
  );
}
