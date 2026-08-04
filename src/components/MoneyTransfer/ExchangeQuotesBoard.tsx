'use client';

/**
 * ExchangeQuotesBoard — جدول چرخشی قیمت‌های صرافی‌ها
 * ----------------------------------------------------------------------------
 * quote های ACTIVE از پایگاه داده را نمایش می‌دهد:
 *   - هر ۴ ثانیه ارز فعال تغییر می‌کند
 *   - countdown انقضا برای هر quote
 *   - buyRate / sellRate هر صرافی
 *   - اگر quote نیست → پیام خالی
 * ----------------------------------------------------------------------------
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import DealModal from '@/components/MoneyTransfer/DealModal';
import { AlertCircle, Clock, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './ExchangeQuotesBoard.module.css';

interface QuotesData {
  quotes: QuoteRow[];
  currencies: string[];
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  AED: 'درهم امارات',
  GBP: 'پوند انگلیس',
  AFN: 'افغانی',
  TRY: 'لیر ترکیه',
  SAR: 'ریال عربستان',
  CAD: 'دلار کانادا',
  AUD: 'دلار استرالیا',
  CHF: 'فرانک سوئیس',
};

const UNIT_LABEL: Record<string, string> = {
  toman: 'تومان',
  rial: 'ریال',
  afn: 'افغانی',
  usd: 'دلار',
};

function formatFa(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  return new Intl.NumberFormat('fa-IR').format(Math.round(n));
}

/**
 * Derive the countdown label from a single shared `now` timestamp. Pure
 * function — no per-row interval, no per-row state. Rows re-render only when
 * the parent's single 1s tick advances `now`.
 */
function formatCountdown(expiresAt: Date | string | null, now: number): string {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return 'منقضی';
  const m = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function QuoteTableRow({
  quote,
  isBestBuy,
  onDeal,
  now,
}: {
  quote: QuoteRow;
  isBestBuy: boolean;
  onDeal: (q: QuoteRow) => void;
  /** Shared timestamp from the parent's single interval (1s tick). */
  now: number;
}) {
  const countdown = formatCountdown(quote.expiresAt, now);
  const buy = Number.parseFloat(quote.buyRate);
  const sell = Number.parseFloat(quote.sellRate);
  const unit = UNIT_LABEL[quote.unit] ?? quote.unit;

  return (
    <>
      {/* Desktop: table row */}
      <tr className={`${s.row} ${s.rowDesktop}${isBestBuy ? ` ${s.rowBest}` : ''}`}>
        <td className={s.exchangeCell}>
          <div className={s.exchangeName}>{quote.exchangeName ?? 'صرافی'}</div>
          {quote.exchangeCity && <div className={s.exchangeCity}>{quote.exchangeCity}</div>}
        </td>
        <td className={s.rateCell}>
          <span className={s.rateLabel}>
            <TrendingDown className={s.rateIcon} aria-hidden />
            خرید
          </span>
          <span className={`${s.rateValue} tabular-nums`}>
            {formatFa(buy)}
            <span className={s.rateUnit}>{unit}</span>
          </span>
        </td>
        <td className={s.rateCell}>
          <span className={s.rateLabel}>
            <TrendingUp className={s.rateIcon} aria-hidden />
            فروش
          </span>
          <span className={`${s.rateValue} tabular-nums`}>
            {formatFa(sell)}
            <span className={s.rateUnit}>{unit}</span>
          </span>
        </td>
        <td className={s.countdownCell} aria-label={countdown ? `انقضا: ${countdown}` : undefined}>
          {countdown && (
            <>
              <Clock className={s.countdownIcon} aria-hidden />
              <span className="tabular-nums">{countdown}</span>
            </>
          )}
        </td>
        <td className={s.badgeCell}>
          {isBestBuy && <span className={s.bestBadge}>بهترین</span>}
          <button
            type="button"
            className={s.dealBtn}
            onClick={() => onDeal(quote)}
            aria-label={`معامله با ${quote.exchangeName ?? 'صرافی'} برای ${quote.currencyCode}`}
          >
            <ShoppingCart className="w-3.5 h-3.5" aria-hidden />
            معامله
          </button>
        </td>
      </tr>

      {/* Mobile: card row (single <tr> با یک <td> که card رو hold می‌کنه) */}
      <tr className={`${s.rowMobile}${isBestBuy ? ` ${s.rowMobileBest}` : ''}`}>
        <td colSpan={5} className={s.cardCell}>
          <div className={s.card}>
            {/* ردیف بالا: اسم صرافی + badge + دکمه */}
            <div className={s.cardTop}>
              <div className={s.cardExchange}>
                <span className={s.exchangeName}>{quote.exchangeName ?? 'صرافی'}</span>
                {quote.exchangeCity && (
                  <span className={s.exchangeCity}>{quote.exchangeCity}</span>
                )}
              </div>
              <div className={s.cardActions}>
                {isBestBuy && <span className={s.bestBadge}>بهترین</span>}
                <button
                  type="button"
                  className={s.dealBtn}
                  onClick={() => onDeal(quote)}
                  aria-label={`معامله با ${quote.exchangeName ?? 'صرافی'} برای ${quote.currencyCode}`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" aria-hidden />
                  معامله
                </button>
              </div>
            </div>
            {/* ردیف پایین: خرید + فروش کنار هم */}
            <div className={s.cardRates}>
              <div className={s.cardRate}>
                <span className={s.rateLabel}>
                  <TrendingDown className={s.rateIcon} aria-hidden />
                  خرید
                </span>
                <span className={`${s.rateValue} tabular-nums`}>
                  {formatFa(buy)}
                  <span className={s.rateUnit}>{unit}</span>
                </span>
              </div>
              <div className={s.cardRateDivider} aria-hidden />
              <div className={s.cardRate}>
                <span className={s.rateLabel}>
                  <TrendingUp className={s.rateIcon} aria-hidden />
                  فروش
                </span>
                <span className={`${s.rateValue} tabular-nums`}>
                  {formatFa(sell)}
                  <span className={s.rateUnit}>{unit}</span>
                </span>
              </div>
              {countdown && (
                <div className={s.cardCountdown}>
                  <Clock className={s.countdownIcon} aria-hidden />
                  <span className="tabular-nums">{countdown}</span>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

const QUOTES_INITIAL = 4;
const QUOTES_STEP = 4;

export default function ExchangeQuotesBoard() {
  const [data, setData] = useState<QuotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCurrencyIdx, setActiveCurrencyIdx] = useState(0);
  const [shownQuotes, setShownQuotes] = useState(QUOTES_INITIAL);
  const [dealQuote, setDealQuote] = useState<QuoteRow | null>(null);
  const fetchRef = useRef<AbortController | null>(null);

  // Single board-wide countdown tick. Always mounted (rules-of-hooks); the
  // interval only runs while a visible quote has a live expiry so the table
  // doesn't re-render every second for nothing.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!data) return;
    const hasLive = data.quotes.some((q) => {
      if (!q.expiresAt) return false;
      return new Date(q.expiresAt).getTime() > Date.now();
    });
    if (!hasLive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data]);

  const fetchData = useCallback(async () => {
    fetchRef.current?.abort();
    const ctl = new AbortController();
    fetchRef.current = ctl;
    try {
      const res = await fetch('/api/exchange-quotes/active', { signal: ctl.signal });
      const json = (await res.json()) as {
        success: boolean;
        data?: QuotesData;
        error?: { message: string };
      };
      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error?.message ?? 'خطا در دریافت قیمت‌ها');
      }
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') {
        setError('ارتباط برقرار نشد');
      }
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, []);

  // initial fetch + refresh every 30s
  useEffect(() => {
    void fetchData();
    const id = setInterval(() => {
      void fetchData();
    }, 30_000);
    return () => {
      clearInterval(id);
      fetchRef.current?.abort();
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className={s.skeleton} aria-busy="true" aria-label="در حال بارگذاری قیمت‌های صرافی‌ها…">
        {/* Tabs skeleton */}
        <div className={s.skeletonTabs}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={s.skeletonTab} style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>
        {/* Thead skeleton */}
        <div className={s.skeletonThead}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={s.skeletonTh} style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>
        {/* Rows skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className={s.skeletonRow} style={{ '--i': i } as React.CSSProperties}>
            <div className={s.skeletonExchange}>
              <div className={s.skeletonExchangeName} />
              <div className={s.skeletonExchangeCity} />
            </div>
            <div className={s.skeletonRate}>
              <div className={s.skeletonRateLabel} />
              <div className={s.skeletonRateVal} />
            </div>
            <div className={s.skeletonRate}>
              <div className={s.skeletonRateLabel} />
              <div className={s.skeletonRateVal} />
            </div>
            <div className={s.skeletonBtn} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.error} role="alert">
        <AlertCircle className={s.errorIcon} aria-hidden />
        {error}
      </div>
    );
  }

  if (!data || data.currencies.length === 0) {
    return (
      <div className={s.empty}>
        <p>در حال حاضر قیمتی از صرافی‌ها موجود نیست.</p>
        <p className={s.emptyHint}>صرافی‌ها می‌توانند از طریق پنل خود قیمت ثبت کنند.</p>
      </div>
    );
  }

  const activeCurrency = data.currencies[activeCurrencyIdx] ?? data.currencies[0];
  if (!activeCurrency) return null;

  const allQuotes = data.quotes
    .filter((q) => q.currencyCode === activeCurrency)
    .sort((a, b) => Number.parseFloat(a.buyRate) - Number.parseFloat(b.buyRate));

  const visibleQuotes = allQuotes.slice(0, shownQuotes);
  const hasMoreQuotes = shownQuotes < allQuotes.length;
  const bestBuyId = allQuotes[0]?.id;

  return (
    <div className={s.board}>
      {/* Currency tabs */}
      <div className={s.tabs} role="tablist" aria-label="انتخاب ارز">
        {data.currencies.map((code, i) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={code === activeCurrency}
            className={`${s.tab}${code === activeCurrency ? ` ${s.tabActive}` : ''}`}
            onClick={() => {
              setActiveCurrencyIdx(i);
              setShownQuotes(QUOTES_INITIAL);
            }}
          >
            <span className={s.tabCode}>{code}</span>
            <span className={s.tabName}>{CURRENCY_NAMES[code] ?? code}</span>
          </button>
        ))}
      </div>

      {/* Semantic table */}
      <table
        className={s.table}
        aria-label={`قیمت‌های ${CURRENCY_NAMES[activeCurrency] ?? activeCurrency}`}
      >
        <thead>
          <tr className={s.tableHeader}>
            <th scope="col">صرافی</th>
            <th scope="col">نرخ خرید</th>
            <th scope="col">نرخ فروش</th>
            <th scope="col">انقضا</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {allQuotes.length === 0 ? (
            <tr>
              <td colSpan={5} className={s.emptyRow}>
                قیمتی برای این ارز موجود نیست
              </td>
            </tr>
          ) : (
            visibleQuotes.map((q) => (
              <QuoteTableRow
                key={q.id}
                quote={q}
                isBestBuy={q.id === bestBuyId}
                onDeal={setDealQuote}
                now={now}
              />
            ))
          )}
        </tbody>
      </table>

      {hasMoreQuotes && (
        <div className={s.loadMoreWrap}>
          <button
            type="button"
            className={s.loadMoreBtn}
            onClick={() => setShownQuotes((n) => Math.min(allQuotes.length, n + QUOTES_STEP))}
          >
            <span>نمایش بیشتر</span>
            <span className={s.loadMoreCount}>+{allQuotes.length - shownQuotes}</span>
          </button>
        </div>
      )}

      <p className={s.foot}>
        قیمت‌ها توسط صرافی‌های تایید‌شده ثبت می‌شوند و هر ۳۰ ثانیه به‌روز می‌گردند.
      </p>

      {/* Deal modal */}
      {dealQuote && (
        <DealModal quote={dealQuote} open={!!dealQuote} onClose={() => setDealQuote(null)} />
      )}
    </div>
  );
}
