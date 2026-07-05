'use client';

/**
 * RateComparisonTable — جدول مقایسه‌ی quote های provider های مختلف.
 *
 * الگو از Wise comparison table + Stripe pricing table:
 *   - ستون‌ها: provider | نوع | spread% | fee ثابت | زمان | مبلغ نهایی
 *   - بهترین quote با border + accent highlight
 *   - کاربران می‌توانند provider را برای جزئیات انتخاب کنند
 *
 * Self-contained: خودش از `/api/money-transfer/rates` داده می‌گیرد (60s cache).
 * اگر `data` به صورت prop پاس داده شود، از همان استفاده می‌کند (برای SSR/hybrid
 * scenario که بعداً لازم شد).
 */

import type { ProviderQuote, TransferApiResponse } from '@/lib/money-transfer/types';
import { Check, Clock, Gauge, Loader2, Tag, TimerReset, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface RateComparisonTableProps {
  /** اگر داده از بیرون تزریق شود (مثلاً SSR)، استفاده می‌شود. */
  data?: TransferApiResponse;
  /** نماد پیش‌فرض برای fetch داخلی */
  defaultSymbol?: string;
  /** مبلغ پیش‌فرض برای fetch داخلی */
  defaultAmount?: number;
  className?: string;
}

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

const KIND_ICON: Record<string, typeof Wallet> = {
  صرافی: Tag,
  'سرویس آنلاین': Wallet,
  بانک: Wallet,
  رمزارز: Gauge,
};

export default function RateComparisonTable({
  data: dataProp,
  defaultSymbol = 'USD',
  defaultAmount = 100,
  className = '',
}: RateComparisonTableProps) {
  const [data, setData] = useState<TransferApiResponse | null>(dataProp ?? null);
  const [loading, setLoading] = useState(!dataProp);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // اگر data prop نیست، خودمان fetch کنیم
  useEffect(() => {
    if (dataProp) {
      setData(dataProp);
      setLoading(false);
      return;
    }
    const ctl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    fetch(
      `/api/money-transfer/rates?symbol=${encodeURIComponent(
        defaultSymbol,
      )}&amount=${defaultAmount}`,
      { signal: ctl.signal },
    )
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j.data) {
          setData(j.data as TransferApiResponse);
        } else {
          setError(j?.error?.message ?? 'خطا در دریافت نرخ');
        }
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') {
          setError('ارتباط برقرار نشد');
        }
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
  }, [dataProp, defaultSymbol, defaultAmount]);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.providers].sort((a, b) => a.finalToman - b.finalToman);
  }, [data]);

  const bestId = sorted[0]?.providerId;
  const worstId = sorted[sorted.length - 1]?.providerId;

  const handleSelect = useCallback((p: ProviderQuote) => {
    // اسکرول به بالا به سمت converter (اگر در صفحه باشد)
    if (typeof window !== 'undefined') {
      const candidate = document.querySelector('.mt-calc, .mt-hero');
      if (candidate instanceof HTMLElement) {
        candidate.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    void p;
  }, []);

  if (loading && !data) {
    return (
      <div className={`ds-workspace__loading ${className}`.trim()} aria-live="polite">
        <Loader2 className="ds-workspace__loading-spin" aria-hidden />
        <span>در حال بارگذاری مقایسه صرافی‌ها…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={`ds-workspace__error ${className}`.trim()} role="alert">
        {error}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className={`ds-comparison-empty ${className}`.trim()}>
        <p>در حال حاضر داده‌ای برای مقایسه موجود نیست.</p>
      </div>
    );
  }

  return (
    <div className={`ds-comparison ${className}`.trim()}>
      <div className="ds-comparison__table" role="table" aria-label="مقایسه صرافی‌ها">
        <div className="ds-comparison__row ds-comparison__row--head" role="row">
          <div className="ds-comparison__cell ds-comparison__cell--name" role="columnheader">
            صرافی
          </div>
          <div className="ds-comparison__cell ds-comparison__cell--kind" role="columnheader">
            نوع
          </div>
          <div className="ds-comparison__cell" role="columnheader">
            کارمزد ضمنی
          </div>
          <div className="ds-comparison__cell" role="columnheader">
            ثابت
          </div>
          <div className="ds-comparison__cell" role="columnheader">
            زمان
          </div>
          <div className="ds-comparison__cell ds-comparison__cell--total" role="columnheader">
            مبلغ نهایی
          </div>
        </div>

        {sorted.map((p, idx) => {
          const KindIcon = KIND_ICON[p.providerKind] ?? Wallet;
          const isBest = p.providerId === bestId;
          const isWorst = p.providerId === worstId && sorted.length > 2;
          return (
            <button
              type="button"
              key={p.providerId}
              onClick={() => handleSelect(p)}
              role="row"
              aria-label={`انتخاب ${p.providerName}`}
              className={`ds-comparison__row ${isBest ? 'ds-comparison__row--best' : ''} ${
                isWorst ? 'ds-comparison__row--worst' : ''
              }`}
            >
              <div className="ds-comparison__cell ds-comparison__cell--name" role="cell">
                <span className="ds-comparison__rank tabular-nums">
                  {idx + 1 < 10 ? `۰${formatFa(idx + 1, 0)}` : formatFa(idx + 1, 0)}
                </span>
                <span className="ds-comparison__name">
                  {p.providerName}
                  {isBest && (
                    <span className="ds-comparison__badge">
                      <Check aria-hidden className="ds-comparison__badge-icon" />
                      بهترین قیمت
                    </span>
                  )}
                </span>
              </div>
              <div className="ds-comparison__cell ds-comparison__cell--kind" role="cell">
                <KindIcon aria-hidden className="ds-comparison__kind-icon" />
                <span>{p.providerKind}</span>
              </div>
              <div className="ds-comparison__cell tabular-nums" role="cell">
                {p.spreadPercent.toFixed(2)}٪
              </div>
              <div className="ds-comparison__cell tabular-nums" role="cell">
                {p.flatFeeToman > 0 ? `${formatFa(p.flatFeeToman)} ت` : '—'}
              </div>
              <div className="ds-comparison__cell tabular-nums" role="cell">
                <span className="ds-comparison__time">
                  <TimerReset aria-hidden className="ds-comparison__time-icon" />
                  {formatDuration(p.speedMinutes)}
                </span>
              </div>
              <div
                className="ds-comparison__cell ds-comparison__cell--total tabular-nums"
                role="cell"
              >
                <Clock aria-hidden className="ds-comparison__total-icon" />
                {formatFa(p.finalToman)}
                <span className="ds-comparison__total-curr">تومان</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="ds-comparison__foot">
        نرخ‌ها از منابع real-time (TGJU + USDT/Exir + FX) هر ۶۰ ثانیه به‌روز می‌شوند.
      </p>
    </div>
  );
}
