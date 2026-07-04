'use client';

/**
 * AtelierTicker — live market ticker band.
 *
 * A smooth, auto-scrolling horizontal band of currency rates (USD, EUR,
 * gold, coin, etc.). Pauses on hover. Doubled-up content so the loop
 * is seamless. Hairline-bordered, with a tiny pulse dot on the left
 * and a fading mask on both edges so the symbols dissolve into the
 * page background.
 *
 * Empty state: if `rates` is empty, the band renders a quiet "نرخ‌ها در
 * دسترس نیست" placeholder so the layout never collapses.
 */

import { cn } from '@/lib/utils';
import { formatWithUnit, formatChangePercent } from '@/lib/market-rates/format';
import type { MarketRateItem } from '@/lib/market-rates';
import { useEffect, useMemo, useState } from 'react';
import { HiOutlineBolt, HiOutlineSignal } from 'react-icons/hi2';

interface AtelierTickerProps {
  rates: MarketRateItem[];
}

type Trend = 'up' | 'down' | 'flat';

function getTrend(changePercent: number): Trend {
  if (!Number.isFinite(changePercent) || Math.abs(changePercent) < 0.01) return 'flat';
  return changePercent > 0 ? 'up' : 'down';
}

export default function AtelierTicker({ rates }: AtelierTickerProps) {
  const [paused, setPaused] = useState(false);
  const [tickstamp, setTickstamp] = useState<string>('');

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const update = () => setTickstamp(fmt.format(new Date()));
    update();
    const t = window.setInterval(update, 60_000);
    return () => window.clearInterval(t);
  }, []);

  const items = useMemo(
    () => rates.filter((r) => Number.isFinite(r.value) && r.value > 0).slice(0, 14),
    [rates],
  );

  if (items.length === 0) {
    return (
      <div className="at-ticker" aria-label="نرخ‌های زنده بازار">
        <div className="at-ticker__rail">
          <span className="at-ticker__lead">
            <HiOutlineSignal className="w-3 h-3" aria-hidden />
            <span>بازار</span>
          </span>
          <span className="at-ticker__empty">نرخ‌ها در دسترس نیست.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="at-ticker"
      aria-label="نرخ‌های زنده بازار"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="at-ticker__rail">
        <span className="at-ticker__lead" aria-hidden>
          <span className="at-ticker__pulse" />
          <HiOutlineBolt className="w-3 h-3" />
          <span>زنده</span>
          {tickstamp && <span className="at-ticker__clock">{tickstamp}</span>}
        </span>

        <div className={cn('at-ticker__viewport', paused && 'is-paused')}>
          <ul className="at-ticker__track" aria-hidden={false}>
            {[...items, ...items].map((r, i) => {
              const trend = getTrend(r.changePercent);
              return (
                <li key={`${r.symbol}-${i}`} className="at-ticker__item">
                  <span className="at-ticker__name">{r.displayNameFa}</span>
                  <span className="at-ticker__value" dir="ltr">
                    {formatWithUnit(r.value, r.unit, r.decimals)}
                  </span>
                  <span className={cn('at-ticker__delta', `is-${trend}`)}>
                    {formatChangePercent(r.changePercent)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
