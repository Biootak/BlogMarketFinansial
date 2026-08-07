'use client';

import { useObs } from './ObsProvider';
import d from './deck.module.css';
import { cssVars, faNum, faPercent, mbShort, msShort, ratio, uptimeFa } from './format';
import { readHealth } from './obsHealth';

interface Reading {
  key: string;
  label: string;
  value: string;
  note?: string;
  fill?: number;
  tone?: 'ok' | 'warn' | 'bad' | 'info' | 'idle';
  chip?: string;
}

/**
 * ریلِ نشانه‌های حیاتی.
 *
 * چیدمان با ترفند «۱ پیکسل gap»: ظرف رنگ خط را می‌گیرد و هر خانه رنگ کاغذ،
 * پس جداکنندهٔ مویی در هر حالتِ wrap دقیقاً درست می‌افتد — بدون border روی
 * فرزندها و بدون nth-child بازی. در RTL هم بی‌نیاز از اصلاح است.
 *
 * هیچ عددی اینجا تزئینی نیست؛ هر کدام مستقیم از snapshot می‌آید و آن‌هایی که
 * تخمینی‌اند (صدک‌های مشتق‌شده) با بجِ صریح علامت می‌خورند.
 */
export function SystemVitals() {
  const { data } = useObs();

  if (!data) {
    return (
      <p className={d.vitalsEmpty}>
        هنوز خوانشی نرسیده است. نشانه‌های حیاتی بعد از اولین هم‌گام‌سازی پر می‌شوند.
      </p>
    );
  }

  const health = readHealth(data);
  const perf = data.performance;
  const measured = perf.latencySource === 'measured';

  const readings: Reading[] = [
    {
      key: 'availability',
      label: 'در دسترس بودن',
      value: health.silent ? '—' : faPercent(health.availability, 2),
      fill: health.silent ? 0 : ratio(health.availability, 100, 2),
      tone: health.silent ? 'idle' : health.availability >= 99.5 ? 'ok' : 'warn',
      note: health.silent ? 'بدون ترافیک' : `${faNum(health.healthy)} سرویس سالم`,
    },
    {
      key: 'errorRate',
      label: 'نرخ خطای ساعت اخیر',
      value: faPercent(perf.errorRate),
      fill: ratio(perf.errorRate, 10, 2),
      tone: perf.errorRate > 2 ? 'bad' : perf.errorRate > 0.5 ? 'warn' : 'ok',
      note: `${faNum(data.totals.errors)} خطا در کل پنجره`,
    },
    {
      key: 'p95',
      label: 'تأخیر p95',
      value: msShort(perf.p95),
      chip: measured ? 'اندازه‌گیری‌شده' : 'تخمینی',
      tone: measured ? 'info' : 'idle',
      note: measured
        ? `${faNum(perf.latencySamples)} نمونهٔ واقعی`
        : 'بدون لاگ duration؛ عدد مشتق‌شده است',
    },
    {
      key: 'throughput',
      label: 'رویداد در ساعت',
      value: faNum(perf.logsPerHour),
      fill: ratio(perf.logsPerHour, Math.max(1, health.peakValue), 2),
      tone: 'info',
      note: `اوج پنجره ${faNum(health.peakValue)}`,
    },
    {
      key: 'sources',
      label: 'منابع فعال',
      value: faNum(data.totals.sources),
      tone: 'info',
      note: `${faNum(data.totals.audit)} رویداد ممیزی`,
    },
    {
      key: 'memory',
      label: 'حافظهٔ پروسه',
      value: mbShort(perf.memoryMb),
      tone: 'idle',
      note: 'heap در لحظهٔ خوانش',
    },
    {
      key: 'uptime',
      label: 'عمر پروسه',
      value: uptimeFa(perf.uptimeSec),
      tone: 'idle',
      note: data.totals.sampled ? 'اعداد پنجره نمونه‌ای‌اند' : 'اسکن کامل پنجره',
    },
  ];

  return (
    <dl className={d.vitals}>
      {readings.map((reading) => (
        <div key={reading.key} className={d.vital} data-tone={reading.tone}>
          <dt className={d.vitalLabel}>{reading.label}</dt>
          <dd className={d.vitalBody}>
            <span className={d.vitalValue}>{reading.value}</span>
            {reading.chip ? <span className={d.vitalChip}>{reading.chip}</span> : null}
            {reading.fill === undefined ? null : (
              <span
                className={d.vitalTrack}
                aria-hidden="true"
                style={cssVars({ '--fill': `${reading.fill}%` })}
              />
            )}
            {reading.note ? <small className={d.vitalNote}>{reading.note}</small> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
