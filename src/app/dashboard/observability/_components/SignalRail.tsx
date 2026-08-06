'use client';

/**
 * SignalRail — ستون ابزار سمت کناری نمای کلی.
 * ─────────────────────────────────────────────────────────────
 *  سه کپسول در یک پنل واحد (نه سه کارت جدا): صدک تأخیر، توزیع سطح لاگ،
 *  و وضعیت پروسه. جداکننده hairline است، نه border کارت.
 *
 *  صداقت داده: اگر هیچ لاگ `duration=` در یک ساعت گذشته نباشد، صدک‌ها
 *  مشتق‌شده‌اند و همین‌جا صریح نوشته می‌شود — عدد تزئینی نداریم.
 */

import { Cpu, Gauge, Layers } from 'lucide-react';
import Link from 'next/link';

import type { ObservabilitySnapshot } from '@/lib/observability';
import {
  cssVars,
  formatNumber,
  formatShare,
  formatUptime,
  levelLabel,
  levelTone,
  msMeasure,
  ratio,
  toneVar,
} from './format';
import s from './SignalRail.module.css';

interface Props {
  data: ObservabilitySnapshot;
}

interface Percentile {
  key: string;
  label: string;
  value: number;
}

export function SignalRail({ data }: Props) {
  const { performance, levels, totals } = data;
  const percentiles: Percentile[] = [
    { key: 'p50', label: 'p50', value: performance.p50 },
    { key: 'p95', label: 'p95', value: performance.p95 },
    { key: 'p99', label: 'p99', value: performance.p99 },
  ];
  const scale = Math.max(performance.p99, 1);
  const measured = performance.latencySource === 'measured';
  const levelTotal = levels.reduce((sum, item) => sum + item.count, 0);

  return (
    <aside className={s.rail} aria-label="شاخص‌های جانبی">
      <section className={s.capsule}>
        <header className={s.capsuleHead}>
          <h2 className={s.capsuleTitle}>
            <Gauge size={15} strokeWidth={1.75} aria-hidden />
            صدک تأخیر
          </h2>
          <Link href="/dashboard/observability/latency" className={s.more}>
            تحلیل کامل
          </Link>
        </header>

        <ul className={s.percentiles}>
          {percentiles.map((item) => {
            const measure = msMeasure(item.value);
            return (
              <li key={item.key} className={s.percentile}>
                <span className={s.pLabel} dir="ltr">
                  {item.label}
                </span>
                <span className={s.pTrack} aria-hidden>
                  <span className={s.pFill} style={cssVars({ '--v': ratio(item.value, scale) })} />
                </span>
                <span className={s.pValue}>
                  {measure.value}
                  <span className={s.unit} dir="ltr">
                    {measure.unit}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <p className={s.note} data-measured={measured}>
          {measured
            ? `اندازه‌گیری‌شده از ${formatNumber(performance.latencySamples)} نمونهٔ واقعی duration`
            : 'تخمینی — در یک ساعت گذشته هیچ لاگ duration ثبت نشده است'}
        </p>
      </section>

      <section className={s.capsule}>
        <header className={s.capsuleHead}>
          <h2 className={s.capsuleTitle}>
            <Layers size={15} strokeWidth={1.75} aria-hidden />
            ترکیب سطح لاگ
          </h2>
        </header>

        {levelTotal === 0 ? (
          <p className={s.empty}>هنوز لاگی در بازهٔ ۲۴ ساعت ثبت نشده است.</p>
        ) : (
          <>
            <div className={s.mix} aria-hidden>
              {levels.map((item) => (
                <span
                  key={item.level}
                  className={s.mixPart}
                  style={cssVars({
                    '--tone': toneVar(levelTone(item.level)),
                    '--w': Math.max(item.share, 0.6),
                  })}
                />
              ))}
            </div>
            <ul className={s.legend}>
              {levels.map((item) => (
                <li key={item.level} className={s.legendRow}>
                  <span
                    className={s.swatch}
                    style={cssVars({ '--tone': toneVar(levelTone(item.level)) })}
                    aria-hidden
                  />
                  <span className={s.legendLabel}>{levelLabel(item.level)}</span>
                  <span className={s.legendValue}>{formatNumber(item.count)}</span>
                  <span className={s.legendShare}>{formatShare(item.share)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={s.capsule}>
        <header className={s.capsuleHead}>
          <h2 className={s.capsuleTitle}>
            <Cpu size={15} strokeWidth={1.75} aria-hidden />
            پروسه و حجم
          </h2>
        </header>

        <dl className={s.facts}>
          <div className={s.fact}>
            <dt>حافظهٔ Heap</dt>
            <dd>
              {formatNumber(performance.memoryMb)}
              <span className={s.unit} dir="ltr">
                MB
              </span>
            </dd>
          </div>
          <div className={s.fact}>
            <dt>در حال اجرا</dt>
            <dd>{formatUptime(performance.uptimeSec)}</dd>
          </div>
          <div className={s.fact}>
            <dt>لاگ در ساعت</dt>
            <dd>{formatNumber(performance.logsPerHour)}</dd>
          </div>
          <div className={s.fact}>
            <dt>نرخ خطای ساعت اخیر</dt>
            <dd data-alert={performance.errorRate > 0}>{formatShare(performance.errorRate)}</dd>
          </div>
          <div className={s.fact}>
            <dt>منابع فعال</dt>
            <dd>{formatNumber(totals.sources)}</dd>
          </div>
          <div className={s.fact}>
            <dt>رد ممیزی ۲۴ ساعت</dt>
            <dd>{formatNumber(totals.audit)}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
