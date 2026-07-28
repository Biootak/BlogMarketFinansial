'use client';

/**
 * MarketTape — Horizontally-scrolling "market tape" of bid/ask quotes.
 *
 *   • Server-rendered content (rates are passed as props from page.tsx).
 *   • CSS-driven marquee (no JS requestAnimationFrame).
 *   • Duplicate list twice for seamless wrap-around.
 *   • Tabular numerals + monospace-feel alignment (tab-aligned cols).
 *   • Renders inside the dark hero on /exchanges.
 */

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
  /** Reverse direction (RTL-aware) */
  reverse?: boolean;
  /** Pause animation on hover (default true) */
  pauseOnHover?: boolean;
  /** Title for the tape head */
  headLabel?: string;
};

const formatFa = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '—';
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
};

const formatSpread = (n: number): string => {
  if (!Number.isFinite(n)) return '۰٫۰۰٪';
  return `${n.toFixed(2)}٪`;
};

function TapeRow({ item, hidden }: { item: TapeItem; hidden?: boolean }) {
  const isUp = item.buy >= item.sell; // edge: shouldn't happen
  return (
    <div className={s.row} aria-hidden={hidden}>
      <span className={s.code}>{item.code}</span>
      <span className={s.exchange}>{item.exchangeName}</span>
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
  );
}

export default function MarketTape({
  items,
  reverse = false,
  pauseOnHover = true,
  headLabel = 'نوار زنده بازار',
}: Props) {
  // duplicate for seamless marquee
  const loop = items.length > 0 ? [...items, ...items] : [];

  return (
    <div
      className={`${s.tape} ${reverse ? s.tapeReverse : ''} ${pauseOnHover ? s.tapePause : ''}`}
      role="region"
      aria-label={headLabel}
    >
      <div className={s.head}>
        <span className={s.pulse} aria-hidden />
        <span className={s.headLabel}>{headLabel}</span>
      </div>
      <div className={s.viewport}>
        {items.length === 0 ? (
          <div className={s.empty}>— نرخ فعالی برای نمایش موجود نیست —</div>
        ) : (
          <div className={s.track}>
          {loop.map((item, i) => (
            <TapeRow key={`${item.id}-${i}`} item={item} hidden={i >= items.length} />
          ))}
        </div>
        )}
        <div className={s.fadeEnd} aria-hidden />
      </div>
    </div>
  );
}
