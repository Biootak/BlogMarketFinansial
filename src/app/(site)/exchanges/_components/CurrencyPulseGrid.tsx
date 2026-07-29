'use client';

/**
 * CurrencyPulseGrid — Currency heatmap of all supported currencies.
 *
 *   • Each tile: code + name + best buy + best sell + Δ indicator (mock seed).
 *   • Tiles sized by liquidity (quote count).
 *   • Click on a tile → calls onSelect (page can sync the comparison board).
 *   • Color-coded by Δ direction (low-saturation brand palette).
 *   • Server-rendered data; no client fetching.
 */

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { switchBoardCurrency } from './LiveRateBoardAsync';
import s from './CurrencyPulseGrid.module.css';

export type PulseTile = {
  code: string;
  name: string;
  bestBuy: number;
  bestSell: number;
  buyExchange: string;
  sellExchange: string;
  quoteCount: number;
  /** simulated 24h change % — purely visual signal, deterministic seed */
  delta: number;
  unit: string;
};

type Props = {
  tiles: PulseTile[];
  /** Currently-selected code (visual focus) */
  activeCode?: string;
  /** Click → switch comparison board */
  onSelect?: (code: string) => void;
};

const formatFa = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n < 1) {
    return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(n);
  }
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
};

const formatDelta = (n: number): string => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}٪`;
};

function deltaTone(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0.05) return 'up';
  if (delta < -0.05) return 'down';
  return 'flat';
}

export default function CurrencyPulseGrid({ tiles, activeCode, onSelect }: Props) {
  if (tiles.length === 0) {
    return (
      <div className={s.empty}>
        <p>هنوز ارز فعالی برای نمایش وجود ندارد.</p>
        <p className={s.emptyHint}>صرافی‌ها می‌توانند از طریق پنل خود نرخ ثبت کنند.</p>
      </div>
    );
  }

  // ۲۰۲۶-۰۷-۲۹: AFN اول (طبق قانون P0 سایت افغانستان)، بعد liquidity desc
  const AFN_PRIORITY = ['AFN', 'USD', 'EUR', 'AED', 'PKR', 'IRR', 'INR', 'CNY', 'TRY', 'GBP', 'SAR', 'RUB'];
  const priority = (code: string) => {
    const idx = AFN_PRIORITY.indexOf(code);
    return idx === -1 ? 1000 + code.charCodeAt(0) : idx;
  };
  const sorted = [...tiles].sort((a, b) => {
    const pa = priority(a.code);
    const pb = priority(b.code);
    if (pa !== pb) return pa - pb;
    return b.quoteCount - a.quoteCount;
  });

  return (
    <div className={s.wrap} role="list" aria-label="نگاه کلی نرخ ارزها">
      {sorted.map((tile, i) => {
        const tone = deltaTone(tile.delta);
        const isActive = activeCode === tile.code;
        // Pick a tile-size tier by quote count (1..3)
        const tier = tile.quoteCount >= 6 ? 'lg' : tile.quoteCount >= 3 ? 'md' : 'sm';
        return (
          <div
            key={tile.code}
            role="listitem"
            className={`${s.tile} ${s[`tier_${tier}`]} ${isActive ? s.tileActive : ''}`}
            style={{ ['--i' as string]: i } as React.CSSProperties}
          >
            <button
              type="button"
              className={s.tileBtn}
              onClick={() => {
                onSelect?.(tile.code);
                switchBoardCurrency(tile.code);
              }}
              aria-pressed={isActive}
              aria-label={`${tile.name} (${tile.code}) — بهترین خرید ${formatFa(tile.bestBuy)}، بهترین فروش ${formatFa(tile.bestSell)}`}
            >
              <span className={s.code}>{tile.code}</span>
              <span
                className={`${s.delta} ${tone === 'up' ? s.deltaUp : tone === 'down' ? s.deltaDown : s.deltaFlat}`}
              >
                {tone === 'up' ? (
                  <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden />
                ) : tone === 'down' ? (
                  <ArrowDownRight size={11} strokeWidth={2.5} aria-hidden />
                ) : null}
                {formatDelta(tile.delta)}
              </span>
              <span className={s.name}>{tile.name}</span>
              <span className={s.rates}>
                <span className={s.rateRow}>
                  <span className={s.rateLabel}>خرید</span>
                  <span className={s.rateVal} dir="ltr">
                    {formatFa(tile.bestBuy)}
                  </span>
                </span>
                <span className={s.rateRow}>
                  <span className={s.rateLabel}>فروش</span>
                  <span className={s.rateVal} dir="ltr">
                    {formatFa(tile.bestSell)}
                  </span>
                </span>
              </span>
              <span className={s.foot}>
                <span className={s.footItem}>{tile.quoteCount} پیشنهاد</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
