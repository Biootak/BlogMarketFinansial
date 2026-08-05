/**
 * ExchangePerformanceBand — مقایسه ادوار (امروز / هفته / ماه) با دوره قبل.
 *
 * سه کارت کنار هم که هر کدام:
 *   - delta درصد count
 *   - delta درصد volume
 *   - نوار پیشرفت نسبی (prev → current)
 *
 * Server Component. داده از قبل aggregate شده.
 */

import type { PerformanceMetrics, PeriodComparison } from '@/actions/exchange-dashboard';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from 'lucide-react';
import s from './ExchangeDashboard.module.css';

// Module-level Intl singleton — created once at module load
const _faNum = new Intl.NumberFormat('fa-IR');

function formatFaNumber(n: number): string {
  return _faNum.format(n);
}

function formatCompact(volumeStr: string): string {
  const minor = BigInt(volumeStr);
  return new Intl.NumberFormat('fa-IR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(minor) / 100);
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function pctDeltaBigInt(currStr: string, prevStr: string): number {
  const curr = Number(BigInt(currStr));
  const prev = Number(BigInt(prevStr));
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function trendDir(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 1) return 'up';
  if (pct < -1) return 'down';
  return 'flat';
}

function Metric({
  label,
  delta,
  current,
  prev,
}: { label: string; delta: number; current: string; prev: string }) {
  const dir = trendDir(delta);
  return (
    <div className={s.perfMetric}>
      <div className={s.perfMetricLabel}>{label}</div>
      <div className={s.perfMetricRow}>
        <span className={s.perfMetricValue} dir="ltr">
          {current}
        </span>
        <span className={s.perfTrend} data-trend={dir}>
          {dir === 'up' && <ArrowUpRight size={11} aria-hidden />}
          {dir === 'down' && <ArrowDownRight size={11} aria-hidden />}
          {dir === 'flat' && <Minus size={11} aria-hidden />}
          <span dir="ltr">{delta > 0 ? `+${delta}` : delta}%</span>
        </span>
      </div>
      <div className={s.perfMetricPrev}>
        دورهٔ قبل: <span dir="ltr">{prev}</span>
      </div>
    </div>
  );
}

function Band({ period, primaryCurrency }: { period: PeriodComparison; primaryCurrency: string }) {
  const countDelta = pctDelta(period.count, period.prevCount);
  const volumeDelta = pctDeltaBigInt(period.volume, period.prevVolume);
  const overallDir = trendDir((countDelta + volumeDelta) / 2);

  // progress bar: نسبت current به max(current, prev) — اگر prev=0 و current>0 → 100%
  const currentNum = Number(BigInt(period.volume));
  const prevNum = Number(BigInt(period.prevVolume));
  const maxVal = Math.max(currentNum, prevNum, 1);
  const currentPct = (currentNum / maxVal) * 100;
  const prevPct = (prevNum / maxVal) * 100;

  return (
    <div className={s.perfBand} data-trend={overallDir}>
      <div className={s.perfBandHead}>
        <span className={s.perfBandLabel}>{period.label}</span>
        <span className={s.perfBandDirection} data-trend={overallDir} aria-hidden>
          {overallDir === 'up' && <ArrowUpRight size={12} />}
          {overallDir === 'down' && <ArrowDownRight size={12} />}
          {overallDir === 'flat' && <Minus size={12} />}
        </span>
      </div>

      <div className={s.perfBandStack}>
        <Metric
          label="تعداد"
          delta={countDelta}
          current={formatFaNumber(period.count)}
          prev={formatFaNumber(period.prevCount)}
        />
        <Metric
          label={`حجم (${primaryCurrency})`}
          delta={volumeDelta}
          current={formatCompact(period.volume)}
          prev={formatCompact(period.prevVolume)}
        />
      </div>

      <div className={s.perfProgress} aria-hidden>
        <div className={s.perfProgressPrev} style={{ insetInlineEnd: `${100 - prevPct}%` }} />
        <div
          className={s.perfProgressCurr}
          style={{ insetInlineEnd: `${100 - currentPct}%` }}
          data-trend={overallDir}
        />
      </div>
    </div>
  );
}

export default function ExchangePerformanceBand({
  metrics,
  primaryCurrency,
}: {
  metrics: PerformanceMetrics;
  primaryCurrency: string;
}) {
  return (
    <div className={s.perfWrap}>
      <div className={s.perfHead}>
        <span className={s.perfHeadIcon} aria-hidden>
          <TrendingUp size={13} />
        </span>
        <span>مقایسهٔ ادوار</span>
      </div>
      <div className={s.perfBands}>
        <Band period={metrics.today} primaryCurrency={primaryCurrency} />
        <div className={s.perfDivider} aria-hidden />
        <Band period={metrics.thisWeek} primaryCurrency={primaryCurrency} />
        <div className={s.perfDivider} aria-hidden />
        <Band period={metrics.thisMonth} primaryCurrency={primaryCurrency} />
      </div>
    </div>
  );
}
