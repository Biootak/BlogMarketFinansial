'use client';

/**
 * LiveRatesBoard — جدول/grid نرخ‌های زندهٔ صرافی.
 *
 *   • Filter chips (همه / خرید بهتر / فروش بهتر)
 *   • Sort (اسپرد صعودی/نزولی + حروف الفبا)
 *   • Cards با sparkline + buy/sell + spread visualization
 *   • Keyboard-navigable, reduced-motion safe
 */

import {
  ArrowDownUp,
  Banknote,
  ChevronDown,
  Filter,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import s from './LiveRatesBoard.module.css';
import Sparkline from './Sparkline';

const _faNum = new Intl.NumberFormat('fa-IR');

type RateRow = {
  currencyCode: string;
  currencyPair: string;
  buyRate: string;
  sellRate: string;
  unit: string;
  spread: number;
  spreadPct: number;
  spark: number[];
  createdAt: Date;
};

type Props = {
  rates: RateRow[];
};

type SortKey = 'spread' | 'code' | 'buy' | 'sell';
type SortDir = 'asc' | 'desc';

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  AED: 'درهم امارات',
  GBP: 'پوند انگلیس',
  AFN: 'افغانی',
  IRR: 'ریال ایران',
  PKR: 'روپیه پاکستان',
  INR: 'روپیه هند',
  TRY: 'لیر ترکیه',
  SAR: 'ریال عربستان',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
  CHF: 'فرانک سوئیس',
  CNY: 'یوان چین',
  JPY: 'ین ژاپن',
};

export default function LiveRatesBoard({ rates }: Props) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('spread');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [active, setActive] = useState<'all' | 'top-buy' | 'top-sell'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rates;
    if (q) {
      list = list.filter(
        (r) =>
          r.currencyCode.toLowerCase().includes(q) ||
          CURRENCY_NAMES[r.currencyCode]?.toLowerCase().includes(q),
      );
    }
    if (active === 'top-buy') {
      // best buy = lowest buy rate (صرافی ارزان‌تر از مشتری می‌خرد)
      list = [...list].sort((a, b) => Number(a.buyRate) - Number(b.buyRate));
    } else if (active === 'top-sell') {
      // best sell = highest sell rate (صرافی گران‌تر به مشتری می‌فروشد)
      list = [...list].sort((a, b) => Number(b.sellRate) - Number(a.sellRate));
    } else {
      list = [...list].sort((a, b) => {
        let av: number;
        let bv: number;
        if (sortKey === 'code') {
          return sortDir === 'asc'
            ? a.currencyCode.localeCompare(b.currencyCode)
            : b.currencyCode.localeCompare(a.currencyCode);
        }
        if (sortKey === 'buy') {
          av = Number(a.buyRate);
          bv = Number(b.buyRate);
        } else if (sortKey === 'sell') {
          av = Number(a.sellRate);
          bv = Number(b.sellRate);
        } else {
          av = a.spreadPct;
          bv = b.spreadPct;
        }
        return sortDir === 'asc' ? av - bv : bv - av;
      });
    }
    return list;
  }, [rates, query, active, sortKey, sortDir]);

  const summary = useMemo(() => {
    if (rates.length === 0) return null;
    const avgSpread = rates.reduce((acc, r) => acc + r.spreadPct, 0) / rates.length;
    const best = [...rates].sort((a, b) => a.spreadPct - b.spreadPct)[0];
    const worst = [...rates].sort((a, b) => b.spreadPct - a.spreadPct)[0];
    return { avgSpread, best, worst };
  }, [rates]);

  return (
    <section className={s.section} id="rates" aria-label="نرخ‌های زندهٔ صرافی" dir="rtl">
      <div className={s.inner}>
        {/* ── Header: title + toolbar ─────────────────────────────── */}
        <header className={s.header}>
          <div className={s.titleBlock}>
            <div className={s.eyebrow}>
              <span className={s.eyebrowDot} aria-hidden />
              <span>تابلوی نرخ‌ها</span>
              <span className={s.eyebrowSep} aria-hidden>
                ·
              </span>
              <span>{_faNum.format(rates.length)} ارز فعال</span>
            </div>
            <h2 className={s.title}>نرخ خرید و فروش لحظه‌ای</h2>
            <p className={s.sub}>
              قیمت‌ها مستقیماً توسط صرافی ثبت می‌شوند. اسپرد نشان‌دهندهٔ فاصلهٔ خرید و فروش است — هرچه
              کمتر باشد، نرخ رقابتی‌تر است.
            </p>
          </div>

          {summary && (
            <div className={s.summary} aria-label="خلاصهٔ اسپرد">
              <div className={s.summaryItem}>
                <span className={s.summaryLabel}>میانگین اسپرد</span>
                <span className={s.summaryValue}>
                  {new Intl.NumberFormat('fa-IR', {
                    maximumFractionDigits: 2,
                  }).format(summary.avgSpread)}
                  <span className={s.summaryUnit}>٪</span>
                </span>
              </div>
              <span className={s.summaryDiv} aria-hidden />
              <div className={s.summaryItem}>
                <span className={s.summaryLabel}>بهترین نرخ</span>
                <span className={s.summaryValueGood}>
                  {summary.best.currencyCode}
                  <span className={s.summaryUnit}>
                    {new Intl.NumberFormat('fa-IR', {
                      maximumFractionDigits: 2,
                    }).format(summary.best.spreadPct)}
                    ٪
                  </span>
                </span>
              </div>
              <span className={s.summaryDiv} aria-hidden />
              <div className={s.summaryItem}>
                <span className={s.summaryLabel}>بالاترین اسپرد</span>
                <span className={s.summaryValueBad}>
                  {summary.worst.currencyCode}
                  <span className={s.summaryUnit}>
                    {new Intl.NumberFormat('fa-IR', {
                      maximumFractionDigits: 2,
                    }).format(summary.worst.spreadPct)}
                    ٪
                  </span>
                </span>
              </div>
            </div>
          )}
        </header>

        {/* ── Toolbar: search + chips + sort ──────────────────────── */}
        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <Search size={14} strokeWidth={1.9} className={s.searchIcon} aria-hidden />
            <input
              type="search"
              className={s.search}
              placeholder="جست‌وجوی ارز…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="جست‌وجوی ارز"
            />
          </div>

          <div className={s.chips} role="tablist" aria-label="فیلتر نرخ‌ها">
            {[
              { key: 'all' as const, label: 'همه' },
              { key: 'top-buy' as const, label: 'بهترین خرید' },
              { key: 'top-sell' as const, label: 'بهترین فروش' },
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                role="tab"
                aria-selected={active === chip.key}
                className={`${s.chip} ${active === chip.key ? s.chipActive : ''}`}
                onClick={() => setActive(chip.key)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {active === 'all' && (
            <div className={s.sort}>
              <Filter size={12} strokeWidth={1.9} aria-hidden />
              <span className={s.sortLabel}>مرتب‌سازی:</span>
              <button
                type="button"
                className={s.sortBtn}
                onClick={() => {
                  if (sortKey === 'spread') {
                    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortKey('spread');
                    setSortDir('asc');
                  }
                }}
                aria-label="مرتب‌سازی بر اساس اسپرد"
              >
                اسپرد
                <ChevronDown
                  size={11}
                  strokeWidth={2.2}
                  className={`${s.sortArrow} ${sortKey === 'spread' && sortDir === 'desc' ? s.sortArrowFlip : ''}`}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className={s.sortBtn}
                onClick={() => {
                  if (sortKey === 'code') {
                    setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortKey('code');
                    setSortDir('asc');
                  }
                }}
                aria-label="مرتب‌سازی بر اساس حروف الفبا"
              >
                <ArrowDownUp size={11} strokeWidth={1.9} aria-hidden />
                کد
              </button>
            </div>
          )}
        </div>

        {/* ── Grid of rate cards ─────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className={s.empty}>
            <Banknote size={28} strokeWidth={1.4} className={s.emptyIcon} aria-hidden />
            <p>ارزی با این فیلتر پیدا نشد.</p>
          </div>
        ) : (
          <div className={s.grid}>
            {filtered.map((r, i) => (
              <RateCard key={r.currencyCode} rate={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RateCard({ rate, index }: { rate: RateRow; index: number }) {
  const buy = Number(rate.buyRate);
  const sell = Number(rate.sellRate);
  const name = CURRENCY_NAMES[rate.currencyCode] ?? rate.currencyCode;
  const isGoodSpread = rate.spreadPct < 1.5;
  const isBadSpread = rate.spreadPct > 3;

  return (
    <article
      className={s.card}
      style={{ '--i': index } as React.CSSProperties}
      data-trend={
        rate.spark.length > 1 && rate.spark[rate.spark.length - 1] > rate.spark[0]
          ? 'up'
          : rate.spark.length > 1 && rate.spark[rate.spark.length - 1] < rate.spark[0]
            ? 'down'
            : 'flat'
      }
    >
      <header className={s.cardHead}>
        <div className={s.cardCurrency}>
          <div className={s.codeMark} aria-hidden>
            <span>{rate.currencyCode.slice(0, 2)}</span>
          </div>
          <div className={s.cardCodeBlock}>
            <h3 className={s.cardCode}>{rate.currencyCode}</h3>
            <span className={s.cardLabel}>{name}</span>
          </div>
        </div>
        <div
          className={`${s.cardSpread} ${isGoodSpread ? s.cardSpreadGood : ''} ${isBadSpread ? s.cardSpreadBad : ''}`}
          title={`اسپرد: ${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(rate.spreadPct)}٪`}
        >
          {rate.spark.length > 1 &&
            (rate.spark[rate.spark.length - 1] > rate.spark[0] ? (
              <TrendingUp size={10} strokeWidth={2.4} aria-hidden />
            ) : rate.spark[rate.spark.length - 1] < rate.spark[0] ? (
              <TrendingDown size={10} strokeWidth={2.4} aria-hidden />
            ) : null)}
          <span>
            {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(rate.spreadPct)}
            <span className={s.cardSpreadUnit}>٪</span>
          </span>
        </div>
      </header>

      <div className={s.cardBody}>
        <div className={s.cardBuySell}>
          <div className={s.bsRow}>
            <span className={s.bsKey}>خرید</span>
            <span className={s.bsValBuy} dir="ltr">
              {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(Math.round(buy))}
              <span className={s.bsUnit}>{rate.unit}</span>
            </span>
          </div>
          <div className={s.bsRow}>
            <span className={s.bsKey}>فروش</span>
            <span className={s.bsValSell} dir="ltr">
              {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                Math.round(sell),
              )}
              <span className={s.bsUnit}>{rate.unit}</span>
            </span>
          </div>
        </div>

        <div className={s.cardSpark}>
          <Sparkline
            values={rate.spark}
            width={180}
            height={36}
            strokeWidth={1.5}
            area
            showEndPoint={false}
            label={`روند ${rate.currencyCode}`}
          />
        </div>
      </div>

      <footer className={s.cardFoot}>
        <span className={s.cardPair} dir="ltr">
          {rate.currencyPair}
        </span>
        <span className={s.cardFootDot} aria-hidden />
        <span className={s.cardFootText}>هر ۶۰ ثانیه</span>
      </footer>
    </article>
  );
}
