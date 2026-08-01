'use client';

/**
 * RateComparisonTable — جدول مقایسه‌ی هزینه انتقال پول
 *
 * Context bar بالای جدول: کاربر مبلغ و ارز را انتخاب می‌کند تا ببیند
 * هر صرافی/سرویس دقیقاً چه مبلغی می‌گیرد.
 *
 * داده: از `/api/money-transfer/rates` با کش ۶۰ ثانیه از provider های DB.
 * اگر providers خالی باشد → empty state واضح نشان می‌دهد.
 */

import type { ProviderQuote, TransferApiResponse } from '@/lib/money-transfer/types';
import { CurrencySelect } from '@/components/ui/CurrencySelect';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './RateComparisonTable.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'دلار آمریکا', flag: '🇺🇸' },
  { code: 'EUR', label: 'یورو', flag: '🇪🇺' },
  { code: 'AED', label: 'درهم', flag: '🇦🇪' },
  { code: 'GBP', label: 'پوند', flag: '🇬🇧' },
  { code: 'TRY', label: 'لیر', flag: '🇹🇷' },
  { code: 'CAD', label: 'دلار کانادا', flag: '🇨🇦' },
] as const;

type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]['code'];

const AMOUNT_PRESETS = [50, 100, 500, 1000] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFa(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.round(value));
}

function formatDuration(min: number): string {
  if (min === 0) return 'لحظه‌ای';
  if (min < 60) return `${formatFa(min)} دقیقه`;
  if (min < 60 * 24) return `${formatFa(Math.round(min / 60))} ساعت`;
  return `${formatFa(Math.round(min / (60 * 24)))} روز`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className={s.skeletonWrap} aria-busy="true" aria-label="در حال بارگذاری…">
      {/* context bar skeleton */}
      <div className={s.skeletonBar}>
        <div className={s.skeletonLabel} />
        <div className={s.skeletonControls}>
          <div className={s.skeletonInput} />
          <div className={s.skeletonPresets}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={s.skeletonPreset}
                style={{ '--i': i } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        <div className={s.skeletonNote} />
      </div>
      {/* caption bar */}
      <div className={s.skeletonCaption} />
      {/* thead */}
      <div className={s.skeletonThead}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={s.skeletonTh} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
      {/* rows — staggered */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={s.skeletonRow} style={{ '--i': i } as React.CSSProperties}>
          {/* name cell */}
          <div className={s.skeletonNameCell}>
            <div className={s.skeletonRank} />
            <div className={s.skeletonNameStack}>
              <div className={s.skeletonName} />
              <div className={s.skeletonKind} />
            </div>
          </div>
          {/* spread */}
          <div className={s.skeletonCell} />
          {/* fee */}
          <div className={s.skeletonCell} />
          {/* speed */}
          <div className={s.skeletonCell} />
          {/* total — wider + accent shimmer */}
          <div className={s.skeletonTotalCell}>
            <div className={s.skeletonTotal} />
            <div className={s.skeletonDelta} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RateComparisonTableProps {
  data?: TransferApiResponse;
  defaultSymbol?: CurrencyCode;
  defaultAmount?: number;
  className?: string;
}

// ─── Context Bar ─────────────────────────────────────────────────────────────

interface ContextBarProps {
  symbol: CurrencyCode;
  amount: number;
  rawAmount: string;
  onSymbolChange: (c: CurrencyCode) => void;
  onAmountChange: (val: string) => void;
  onPreset: (n: number) => void;
  baseTomanRate: number | null;
  loading: boolean;
  updatedAt: string | null;
}

function ContextBar({
  symbol,
  amount,
  rawAmount,
  onSymbolChange,
  onAmountChange,
  onPreset,
  baseTomanRate,
  loading,
  updatedAt,
}: ContextBarProps) {
  const cur = CURRENCY_OPTIONS.find((c) => c.code === symbol) ?? CURRENCY_OPTIONS[0];

  return (
    <div className={s.contextBar}>
      <p className={s.contextLabel}>مقدار و ارز مورد نظرتان را وارد کنید:</p>

      <div className={s.contextControls}>
        <div className={s.amountWrap}>
          <input
            id="rct-amount"
            type="number"
            className={s.amountInput}
            value={rawAmount}
            min={1}
            max={100000}
            step={1}
            dir="ltr"
            aria-label="مبلغ"
            onChange={(e) => onAmountChange(e.target.value)}
          />
          {/* H15-fix: native <select> → CurrencySelect مشترک (قانون
              «NO NATIVE FORM CONTROLS» پروژه). */}
          <CurrencySelect
            className={s.currencySelect}
            value={symbol}
            ariaLabel="ارز"
            size="compact"
            items={CURRENCY_OPTIONS.map((c) => ({
              value: c.code,
              code: c.code,
              label: `${c.flag} ${c.code}`,
            }))}
            onChange={(v) => onSymbolChange(v as CurrencyCode)}
          />
        </div>

        <fieldset className={s.presets}>
          <legend className="sr-only">مبالغ پیشنهادی</legend>
          {AMOUNT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className={`${s.preset}${amount === n ? ` ${s.presetActive}` : ''}`}
              onClick={() => onPreset(n)}
            >
              {n}
            </button>
          ))}
        </fieldset>
      </div>

      {baseTomanRate != null && baseTomanRate > 0 && (
        <p className={s.baseRateNote}>
          نرخ پایه بازار: ۱ {cur.code} = {formatFa(baseTomanRate)} تومان
          {loading && <RefreshCw className={s.refreshSpin} aria-hidden />}
          {updatedAt && !loading && (
            <span className={s.updatedTime}>
              <Clock className="w-3 h-3" aria-hidden />
              {new Date(updatedAt).toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// ─── Provider Row ─────────────────────────────────────────────────────────────

function ProviderRow({
  p,
  isBest,
  isWorst,
  marketToman,
  rank,
}: {
  p: ProviderQuote;
  isBest: boolean;
  isWorst: boolean;
  marketToman: number;
  rank: number;
}) {
  const savingVsMarket = marketToman > 0 ? p.finalToman - marketToman : 0;
  const savingSign = savingVsMarket > 0 ? '+' : '';

  return (
    <tr className={`${s.row}${isBest ? ` ${s.rowBest}` : ''}${isWorst ? ` ${s.rowWorst}` : ''}`}>
      <td className={s.nameCell}>
        <span className={`${s.rank} tabular-nums`}>{rank}</span>
        <span className={s.nameWrap}>
          <span className={s.name}>
            {p.providerName}
            {isBest && (
              <span className={s.bestBadge} aria-label="ارزان‌ترین">
                <BadgeCheck size={12} strokeWidth={2.5} className={s.bestBadgeIcon} aria-hidden />
                ارزان‌ترین
              </span>
            )}
          </span>
          <span className={s.kind}>{p.providerKind}</span>
        </span>
      </td>

      <td className={`${s.cell} tabular-nums`}>
        <span className={s.spreadVal}>{p.spreadPercent.toFixed(2)}٪</span>
      </td>

      <td className={`${s.cell} tabular-nums`}>
        {p.flatFeeToman > 0 ? (
          <span className={s.feeVal}>{formatFa(p.flatFeeToman)} ت</span>
        ) : (
          <span className={s.feeNone}>رایگان</span>
        )}
      </td>

      <td className={`${s.cell} tabular-nums`}>
        <span className={s.speed}>
          <Clock className="w-3 h-3" aria-hidden />
          {formatDuration(p.speedMinutes)}
        </span>
      </td>

      <td className={`${s.totalCell} tabular-nums`}>
        <span className={`${s.totalVal}${isBest ? ` ${s.totalBest}` : ''}`}>
          {formatFa(p.finalToman)}
          <span className={s.totalUnit}> ت</span>
        </span>
        {savingVsMarket !== 0 && (
          <span className={`${s.delta}${savingVsMarket > 0 ? ` ${s.deltaPos}` : ` ${s.deltaNeg}`}`}>
            {savingVsMarket > 0 ? (
              <TrendingUp className="w-3 h-3" aria-hidden />
            ) : (
              <TrendingDown className="w-3 h-3" aria-hidden />
            )}
            {savingSign}
            {formatFa(Math.abs(savingVsMarket))} ت
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PROVIDERS_INITIAL = 4;
const PROVIDERS_STEP = 4;

export default function RateComparisonTable({
  data: dataProp,
  defaultSymbol = 'USD',
  defaultAmount = 100,
  className = '',
}: RateComparisonTableProps) {
  const [symbol, setSymbol] = useState<CurrencyCode>(defaultSymbol as CurrencyCode);
  const [rawAmount, setRawAmount] = useState<string>(String(defaultAmount));
  const [shownProviders, setShownProviders] = useState(PROVIDERS_INITIAL);
  const amount = useMemo(() => {
    const n = Number.parseFloat(rawAmount);
    return Number.isFinite(n) && n > 0 ? n : defaultAmount;
  }, [rawAmount, defaultAmount]);

  const [data, setData] = useState<TransferApiResponse | null>(dataProp ?? null);
  const [loading, setLoading] = useState(!dataProp);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (sym: string, amt: number) => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/money-transfer/rates?symbol=${encodeURIComponent(sym)}&amount=${amt}`,
        { signal: ctl.signal },
      );
      const json = await res.json();
      if (json?.success && json.data) {
        setData(json.data as TransferApiResponse);
      } else {
        setError(json?.error?.message ?? 'خطا در دریافت نرخ');
      }
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') {
        setError('ارتباط برقرار نشد');
      }
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, []);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (dataProp) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      void fetchData(symbol, amount);
      return () => abortRef.current?.abort();
    }
    const id = setTimeout(() => {
      void fetchData(symbol, amount);
    }, 400);
    return () => clearTimeout(id);
  }, [symbol, amount, fetchData, dataProp]);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.providers].sort((a, b) => a.finalToman - b.finalToman);
  }, [data]);

  const visibleProviders = sorted.slice(0, shownProviders);
  const hasMoreProviders = shownProviders < sorted.length;
  const bestId = sorted[0]?.providerId;
  const worstId = sorted[sorted.length - 1]?.providerId;
  const marketToman = data ? data.baseTomanRate * amount : 0;

  // Initial loading — full skeleton
  if (loading && !data) {
    return <TableSkeleton />;
  }

  return (
    <div className={`${s.wrap}${className ? ` ${className}` : ''}`}>
      <ContextBar
        symbol={symbol}
        amount={amount}
        rawAmount={rawAmount}
        onSymbolChange={(c) => setSymbol(c)}
        onAmountChange={(v) => setRawAmount(v)}
        onPreset={(n) => {
          setRawAmount(String(n));
        }}
        baseTomanRate={data?.baseTomanRate ?? null}
        loading={loading}
        updatedAt={data?.updatedAt ?? null}
      />

      {error && !data && (
        <div className={s.stateBox} role="alert">
          <span>{error}</span>
          <button
            type="button"
            className={s.retryBtn}
            onClick={() => void fetchData(symbol, amount)}
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className={s.emptyBox}>
          <ArrowLeft className="w-5 h-5 opacity-40" aria-hidden />
          <p>در حال حاضر داده‌ای برای مقایسه موجود نیست.</p>
          <p className={s.emptyHint}>صرافی‌ها و سرویس‌های انتقال پول از طریق داشبورد اضافه می‌شوند.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className={s.tableWrap}>
          <div className={s.tableCaption} aria-live="polite" aria-atomic="true">
            {loading && <RefreshCw className={s.refreshSpinSm} aria-hidden />}
            <span>
              مقایسه هزینه ارسال <strong className="tabular-nums">{formatFa(amount)}</strong>{' '}
              {symbol}
              {data?.baseDisplayName ? ` (${data.baseDisplayName})` : ''}
            </span>
          </div>

          <table className={s.table} aria-label={`مقایسه هزینه ارسال ${amount} ${symbol}`}>
            <thead>
              <tr className={s.thead}>
                <th scope="col" className={s.thName}>
                  صرافی / سرویس
                </th>
                <th scope="col" className={s.th}>
                  کارمزد ضمنی
                </th>
                <th scope="col" className={s.th}>
                  کارمزد ثابت
                </th>
                <th scope="col" className={s.th}>
                  زمان
                </th>
                <th scope="col" className={`${s.th} ${s.thTotal}`}>
                  مبلغ نهایی
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleProviders.map((p, idx) => (
                <ProviderRow
                  key={p.providerId}
                  p={p}
                  isBest={p.providerId === bestId}
                  isWorst={p.providerId === worstId && sorted.length > 2}
                  marketToman={marketToman}
                  rank={idx + 1}
                />
              ))}
            </tbody>
          </table>

          {hasMoreProviders && (
            <div className={s.loadMoreWrap}>
              <button
                type="button"
                className={s.loadMoreBtn}
                onClick={() =>
                  setShownProviders((n) => Math.min(sorted.length, n + PROVIDERS_STEP))
                }
              >
                <span>نمایش بیشتر</span>
                <span className={s.loadMoreCount}>+{sorted.length - shownProviders}</span>
              </button>
            </div>
          )}

          <p className={s.foot}>
            <Check className="w-3 h-3" aria-hidden />
            مبالغ بر اساس نرخ پایه بازار آزاد محاسبه می‌شوند. نرخ‌ها هر ۶۰ ثانیه به‌روز می‌شوند.
          </p>
        </div>
      )}
    </div>
  );
}
