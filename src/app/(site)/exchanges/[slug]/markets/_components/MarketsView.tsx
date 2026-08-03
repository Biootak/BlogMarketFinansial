'use client';

/**
 * MarketsView — جدول کامل بازارها (compact + sortable).
 *
 *   • جدول بزرگ برای desktop
 *   • کارت‌چین برای موبایل
 *   • sortable per column
 */

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import Sparkline from '../../_components/Sparkline';
import s from './MarketsView.module.css';

type Rate = {
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
  exchange: { name: string; city: string | null; address: string | null };
  rates: Rate[];
};

const FA: Record<string, string> = {
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

type SortKey = 'code' | 'buy' | 'sell' | 'spread';
type SortDir = 'asc' | 'desc';

export default function MarketsView({ exchange, rates }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const list = [...rates];
    list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === 'code') {
        av = a.currencyCode;
        bv = b.currencyCode;
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
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
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return list;
  }, [rates, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(k);
      setSortDir('asc');
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={11} strokeWidth={1.9} aria-hidden />;
    return sortDir === 'asc' ? (
      <ArrowUp size={11} strokeWidth={2.2} aria-hidden />
    ) : (
      <ArrowDown size={11} strokeWidth={2.2} aria-hidden />
    );
  }

  return (
    <section className={s.section} dir="rtl" aria-label={`بازارهای ${exchange.name}`}>
      <div className={s.inner}>
        <header className={s.header}>
          <div>
            <h1 className={s.title}>بازارهای {exchange.name}</h1>
            <p className={s.sub}>جدول کامل نرخ‌های فعال. برای مقایسهٔ سریع، روی هر ستون کلیک کنید.</p>
          </div>
        </header>

        {/* Desktop table */}
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => toggleSort('code')} className={s.thBtn}>
                    ارز <SortIcon k="code" />
                  </button>
                </th>
                <th className={s.thNum}>
                  <button type="button" onClick={() => toggleSort('buy')} className={s.thBtn}>
                    خرید <SortIcon k="buy" />
                  </button>
                </th>
                <th className={s.thNum}>
                  <button type="button" onClick={() => toggleSort('sell')} className={s.thBtn}>
                    فروش <SortIcon k="sell" />
                  </button>
                </th>
                <th className={s.thNum}>
                  <button type="button" onClick={() => toggleSort('spread')} className={s.thBtn}>
                    اسپرد <SortIcon k="spread" />
                  </button>
                </th>
                <th className={s.thChart}>روند ۲۴ ساعت</th>
                <th className={s.thMeta}>واحد</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const name = FA[r.currencyCode] ?? r.currencyCode;
                const _trend =
                  r.spark.length > 1 && r.spark[r.spark.length - 1] > r.spark[0]
                    ? 'up'
                    : r.spark.length > 1 && r.spark[r.spark.length - 1] < r.spark[0]
                      ? 'down'
                      : 'flat';
                return (
                  <tr key={r.currencyCode}>
                    <td>
                      <div className={s.coinCell}>
                        <span className={s.coinMark} aria-hidden>
                          {r.currencyCode.slice(0, 2)}
                        </span>
                        <div className={s.coinName}>
                          <span className={s.coinCode}>{r.currencyCode}</span>
                          <span className={s.coinFa}>{name}</span>
                        </div>
                      </div>
                    </td>
                    <td className={s.tdNum} dir="ltr">
                      <span className={s.buyVal}>
                        {new Intl.NumberFormat('fa-IR', {
                          maximumFractionDigits: 0,
                        }).format(Math.round(Number(r.buyRate)))}
                      </span>
                    </td>
                    <td className={s.tdNum} dir="ltr">
                      <span className={s.sellVal}>
                        {new Intl.NumberFormat('fa-IR', {
                          maximumFractionDigits: 0,
                        }).format(Math.round(Number(r.sellRate)))}
                      </span>
                    </td>
                    <td className={s.tdNum}>
                      <span
                        className={`${s.spread} ${r.spreadPct < 1.5 ? s.spreadGood : ''} ${r.spreadPct > 3 ? s.spreadBad : ''}`}
                      >
                        {new Intl.NumberFormat('fa-IR', {
                          maximumFractionDigits: 2,
                        }).format(r.spreadPct)}
                        <span className={s.spreadUnit}>٪</span>
                      </span>
                    </td>
                    <td className={s.tdChart}>
                      {r.spark.length > 1 ? (
                        <Sparkline
                          values={r.spark}
                          width={140}
                          height={32}
                          strokeWidth={1.4}
                          area={false}
                          showEndPoint
                          label={`روند ${r.currencyCode}`}
                        />
                      ) : (
                        <span className={s.noChart}>—</span>
                      )}
                    </td>
                    <td className={s.tdMeta} dir="ltr">
                      {r.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards (fallback) */}
        <div className={s.mobileGrid}>
          {sorted.map((r) => {
            const name = FA[r.currencyCode] ?? r.currencyCode;
            return (
              <article key={r.currencyCode} className={s.mCard}>
                <div className={s.mHead}>
                  <div className={s.coinCell}>
                    <span className={s.coinMark} aria-hidden>
                      {r.currencyCode.slice(0, 2)}
                    </span>
                    <div>
                      <div className={s.coinCode}>{r.currencyCode}</div>
                      <div className={s.coinFa}>{name}</div>
                    </div>
                  </div>
                  {r.spark.length > 1 && (
                    <Sparkline
                      values={r.spark}
                      width={80}
                      height={28}
                      strokeWidth={1.3}
                      area
                      showEndPoint={false}
                    />
                  )}
                </div>
                <div className={s.mBody}>
                  <div>
                    <span className={s.mKey}>خرید</span>
                    <span className={s.buyVal} dir="ltr">
                      {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                        Math.round(Number(r.buyRate)),
                      )}
                      <span className={s.mUnit}>{r.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className={s.mKey}>فروش</span>
                    <span className={s.sellVal} dir="ltr">
                      {new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(
                        Math.round(Number(r.sellRate)),
                      )}
                      <span className={s.mUnit}>{r.unit}</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
