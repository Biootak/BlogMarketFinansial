'use client';

/**
 * MarketTape — Horizontally-scrolling "market tape" of bid/ask quotes.
 *
 *   • Server-rendered content (rates are passed as props from page.tsx).
 *   • Uses the **shared `Ticker`** component (CSS-driven marquee, GPU-accelerated,
 *     pause-on-hover, respects prefers-reduced-motion) so the animation is
 *     identical to every other ticker on the site.
 *   • Renders inside the dark hero on /exchanges — preserves the local
 *     head/pulse/viewport visuals; only the scrolling part comes from Ticker.
 */

import Ticker from '@/components/Ticker';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import s from './MarketTape.module.css';

export type TapeItem = {
  id: string;
  code: string; // USD
  name: string; // دلار آمریکا
  unit: string; // تومان
  buy: number;
  sell: number;
  spreadPct: number; // مثال: 0.42
  exchangeName: string;
};

type Props = {
  items: TapeItem[];
  /** Pause animation on hover (default true) */
  pauseOnHover?: boolean;
  /** Title for the tape head */
  headLabel?: string;
};

const _faNum = new Intl.NumberFormat('fa-IR');

const formatFa = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '—';
  return _faNum.format(Math.round(n));
};

const formatSpread = (n: number): string => {
  if (!Number.isFinite(n)) return '۰٫۰۰٪';
  return `${n.toFixed(2)}٪`;
};

function TapeRow({ item }: { item: TapeItem }) {
  const isUp = item.buy >= item.sell;
  return (
    <>
      <div className={s.row}>
        <span className={s.code}>{item.code}</span>
        <span className={s.name}>{item.name}</span>
        <span className={`${s.cell} ${s.cellBuy}`}>
          <ArrowDownRight size={10} strokeWidth={2.5} className={s.cellIcon} aria-hidden />
          <span className={s.cellLabel}>خرید</span>
          <span className={s.cellVal} dir="ltr">
            {formatFa(item.buy)}
          </span>
          <span className={s.cellUnit}>{item.unit}</span>
        </span>
        <span className={s.sep} aria-hidden>
          /
        </span>
        <span className={`${s.cell} ${s.cellSell}`}>
          <ArrowUpRight size={10} strokeWidth={2.5} className={s.cellIcon} aria-hidden />
          <span className={s.cellLabel}>فروش</span>
          <span className={s.cellVal} dir="ltr">
            {formatFa(item.sell)}
          </span>
          <span className={s.cellUnit}>{item.unit}</span>
        </span>
        <span className={`${s.spread} ${isUp ? s.spreadNeg : s.spreadPos}`}>
          {formatSpread(item.spreadPct)}
        </span>
      </div>
      {/* جداکننده بصری بین آیتم‌ها */}
      <span className={s.divider} aria-hidden />
    </>
  );
}

export default function MarketTape({
  items,
  pauseOnHover = true,
  headLabel = 'نوار زنده بازار',
}: Props) {
  return (
    <div className={s.tape} role="region" aria-label={headLabel}>
      <div className={s.head}>
        <span className={s.pulse} aria-hidden />
        <span className={s.headLabel}>{headLabel}</span>
      </div>
      {items.length === 0 ? (
        <div className={s.empty}>— نرخ فعالی برای نمایش موجود نیست —</div>
      ) : (
        <Ticker
          duration={90}
          repeat={3}
          gap="0"
          direction="ltr"
          pauseOnHover={pauseOnHover}
          className={s.tickerShell}
          aria-label={headLabel}
        >
          {items.map((item) => (
            <TapeRow key={item.id} item={item} />
          ))}
        </Ticker>
      )}
    </div>
  );
}
