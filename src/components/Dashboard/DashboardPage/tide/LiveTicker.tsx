'use client';

/**
 * LiveTicker — TIDE 2026 (July 1) live rate ribbon.
 *
 * A horizontal marquee anchored to the top of the dashboard. Shows the
 * most relevant market signals + system signals in a single, scannable
 * ribbon. Designed to look like a Bloomberg/TradingView tape, but with
 * 2026 polish (smooth infinite scroll, RTL-aware, dark/light parity,
 * reduced-motion respected).
 *
 * Items are duplicated so the CSS keyframe loop is seamless regardless
 * of viewport width.
 *
 * Each chip is a real <a> if it has a destination (rate → /dashboard/exchange-rates,
 * build → /dashboard/settings, sync → /dashboard/reports). Otherwise it's
 * a status indicator that just informs.
 */

import { cn } from '@/lib/utils';
import {
  HiOutlineArrowTrendingUp,
  HiOutlineCircleStack,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineCurrencyDollar,
  HiOutlineSparkles,
} from 'react-icons/hi2';

export interface TickerItem {
  id: string;
  label: string;
  value: string;
  delta?: string;
  tone?: 'up' | 'down' | 'flat' | 'info';
  href?: string;
}

interface LiveTickerProps {
  items: ReadonlyArray<TickerItem>;
  /** When true, show a subtle left/right fade mask to indicate scroll. */
  fade?: boolean;
}

const TONE_MAP: Record<NonNullable<TickerItem['tone']>, string> = {
  up: 'tide-ticker__chip--up',
  down: 'tide-ticker__chip--down',
  flat: 'tide-ticker__chip--flat',
  info: 'tide-ticker__chip--info',
};

const ICON_MAP: Record<string, React.ReactNode> = {
  usd: <HiOutlineCurrencyDollar className="w-3.5 h-3.5" />,
  eur: <HiOutlineCurrencyDollar className="w-3.5 h-3.5" />,
  gold: <HiOutlineCircleStack className="w-3.5 h-3.5" />,
  coin: <HiOutlineSparkles className="w-3.5 h-3.5" />,
  trend: <HiOutlineArrowTrendingUp className="w-3.5 h-3.5" />,
  build: <HiOutlineCpuChip className="w-3.5 h-3.5" />,
  sync: <HiOutlineClock className="w-3.5 h-3.5" />,
};

export default function LiveTicker({ items, fade = true }: LiveTickerProps) {
  if (!items.length) return null;
  const stream = [...items, ...items];

  return (
    <div
      className={cn('tide-ticker', fade && 'tide-ticker--fade')}
      role="region"
      aria-label="نوار زنده‌ی نرخ‌ها و وضعیت سیستم"
    >
      <span className="tide-ticker__pin" aria-hidden>
        <span className="tide-ticker__pin-dot" />
        LIVE
      </span>

      <div className="tide-ticker__viewport">
        <div className="tide-ticker__track" dir="ltr">
          {stream.map((item, i) => {
            const inner = (
              <span
                key={`${item.id}-${i}`}
                className={cn('tide-ticker__chip', item.tone && TONE_MAP[item.tone])}
              >
                <span className="tide-ticker__chip-ico" aria-hidden>
                  {ICON_MAP[item.id.split('-')[0] ?? ''] ?? <HiOutlineArrowTrendingUp />}
                </span>
                <span className="tide-ticker__chip-label">{item.label}</span>
                <span className="tide-ticker__chip-sep" aria-hidden>
                  ·
                </span>
                <span className="tide-ticker__chip-value tabular-nums">{item.value}</span>
                {item.delta && (
                  <span
                    className={cn(
                      'tide-ticker__chip-delta tabular-nums',
                      item.tone === 'down' && 'is-down',
                      item.tone === 'up' && 'is-up',
                    )}
                  >
                    {item.delta}
                  </span>
                )}
              </span>
            );
            return item.href ? (
              <a
                key={`${item.id}-anchor-${i}`}
                href={item.href}
                className="tide-ticker__anchor"
                aria-label={`${item.label}: ${item.value}`}
              >
                {inner}
              </a>
            ) : (
              <span key={`${item.id}-anchor-${i}`} className="tide-ticker__anchor" aria-hidden>
                {inner}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
