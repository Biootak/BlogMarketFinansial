'use client';

/**
 * LatencyBoard — بخش «تأخیر».
 * ─────────────────────────────────────────────────────────────
 *  صدک‌ها همان چیزی هستند که lib از لاگ‌های `duration=` می‌سازد. اگر نمونهٔ
 *  واقعی وجود نداشته باشد، عدد مشتق‌شده است و صفحه صریح همین را می‌گوید؛
 *  عدد بی‌پشتوانه نمایش نمی‌دهیم.
 */

import { Gauge, Server } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import type { ObservabilitySnapshot } from '@/lib/observability';
import { LiveBar } from './LiveBar';
import {
  cssVars,
  formatDecimal,
  formatNumber,
  formatShare,
  msMeasure,
  ratio,
  statusLabel,
  statusTone,
  toneVar,
} from './format';
import { useObservabilityFeed } from './useObservabilityFeed';
import s from './LatencyBoard.module.css';

interface Props {
  initialData: ObservabilitySnapshot;
}

const PERCENTILE_NOTE: Record<string, string> = {
  p50: 'نیمی از درخواست‌ها سریع‌تر از این عدد پاسخ گرفته‌اند',
  p95: 'مرز تجربهٔ کاربر — پنج درصد کندتر از این‌اند',
  p99: 'دم توزیع؛ کندترین یک درصد',
};

export function LatencyBoard({ initialData }: Props) {
  const { data, now, status, refresh } = useObservabilityFeed(initialData);
  const { performance } = data;
  const measured = performance.latencySource === 'measured';

  const percentiles = [
    { key: 'p50', value: performance.p50 },
    { key: 'p95', value: performance.p95 },
    { key: 'p99', value: performance.p99 },
  ];
  const scale = Math.max(performance.p99, 1);

  const services = useMemo(
    () => [...data.services].sort((a, b) => b.latencyMs - a.latencyMs),
    [data.services],
  );
  const slowest = services[0]?.latencyMs ?? 1;

  return (
    <div className={s.board}>
      <LiveBar
        generatedAt={data.generatedAt}
        now={now}
        status={status}
        onRefresh={refresh}
        sampled={data.totals.sampled}
      >
        <span className={s.chips}>
          <span className={s.chip} data-strong="true">
            p95 برابر {msMeasure(performance.p95).value}
            <span className={s.unit} dir="ltr">
              {msMeasure(performance.p95).unit}
            </span>
          </span>
          <span className={s.chip}>نرخ خطا {formatShare(performance.errorRate)}</span>
          <span className={s.chip}>{formatNumber(performance.logsPerHour)} لاگ در ساعت</span>
        </span>
      </LiveBar>

      <section className={s.panel} aria-labelledby="obs-percentiles">
        <header className={s.panelHead}>
          <h2 id="obs-percentiles" className={s.panelTitle}>
            <Gauge size={15} strokeWidth={1.75} aria-hidden />
            صدک‌های پاسخ‌گویی
          </h2>
          <p className={s.panelCaption}>
            {measured
              ? `از ${formatNumber(performance.latencySamples)} نمونهٔ واقعی duration در یک ساعت گذشته محاسبه شده است.`
              : 'هیچ لاگ duration در یک ساعت گذشته نبود؛ اعداد زیر مشتق‌شده از نرخ خطا و حجم لاگ‌اند و باید با احتیاط خوانده شوند.'}
          </p>
        </header>

        <ul className={s.percentiles}>
          {percentiles.map((item) => {
            const measure = msMeasure(item.value);
            return (
              <li key={item.key} className={s.percentile} data-measured={measured}>
                <span className={s.pLabel} dir="ltr">
                  {item.key}
                </span>
                <span className={s.pValue}>
                  {measure.value}
                  <span className={s.unit} dir="ltr">
                    {measure.unit}
                  </span>
                </span>
                <span className={s.pTrack} aria-hidden>
                  <span className={s.pFill} style={cssVars({ '--v': ratio(item.value, scale) })} />
                </span>
                <span className={s.pNote}>{PERCENTILE_NOTE[item.key] ?? ''}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={s.panel} aria-labelledby="obs-services">
        <header className={s.panelHead}>
          <h2 id="obs-services" className={s.panelTitle}>
            <Server size={15} strokeWidth={1.75} aria-hidden />
            تأخیر هر سرویس
          </h2>
          <p className={s.panelCaption}>
            کندترین سرویس بالا. عدد تأخیر از پروفایل پایهٔ سرویس و شدت خطای ۱۵ دقیقهٔ اخیرش ساخته
            می‌شود؛ حجم و خطا مستقیم از SystemLog می‌آید.
          </p>
        </header>

        {services.length === 0 ? (
          <EmptyState
            icon={Server}
            title="سرویسی برای نمایش نیست"
            description="هیچ سرویسی در پیکربندی مرکز پایش تعریف نشده است."
          />
        ) : (
          <ul className={s.services}>
            {services.map((service) => {
              const measure = msMeasure(service.latencyMs);
              const tone = statusTone(service.status);
              return (
                <li
                  key={service.id}
                  className={s.service}
                  style={cssVars({ '--tone': toneVar(tone) })}
                >
                  <Link href={service.href} className={s.serviceLink}>
                    <span className={s.serviceName}>{service.name}</span>
                    <span className={s.serviceDesc}>{service.desc}</span>
                    <span className={s.serviceBar} aria-hidden>
                      <span
                        className={s.serviceFill}
                        style={cssVars({ '--v': ratio(service.latencyMs, slowest) })}
                      />
                    </span>
                    <span className={s.serviceValue}>
                      {measure.value}
                      <span className={s.unit} dir="ltr">
                        {measure.unit}
                      </span>
                    </span>
                    <span className={s.serviceMeta}>
                      {formatDecimal(service.uptime24h, 2)}٪ در دسترس ·{' '}
                      {formatNumber(service.events24h)} رویداد · {formatNumber(service.errors24h)}{' '}
                      خطا
                    </span>
                    <span className={s.serviceBadge}>{statusLabel(service.status)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
