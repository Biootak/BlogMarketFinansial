'use client';

import { ArrowLeft, ServerCog } from 'lucide-react';
import Link from 'next/link';

<<<<<<< HEAD
import type { ServiceHealth } from '@/lib/observability';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { faNum, faPercent, msShort, ratio } from './format';
import s from './obs.module.css';

const STATUS_LABEL: Record<string, string> = {
  healthy: 'سالم',
  degraded: 'کند',
  down: 'قطع',
  idle: 'بی‌صدا',
  unknown: 'نامشخص',
};
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'idle'> = {
  healthy: 'ok',
  degraded: 'warn',
  down: 'bad',
  idle: 'idle',
};
const RISK: Record<string, number> = { down: 0, degraded: 1, healthy: 2, idle: 3 };
const byRisk = (a: ServiceHealth, b: ServiceHealth): number => {
  const delta = (RISK[a.status] ?? 9) - (RISK[b.status] ?? 9);
  return delta !== 0 ? delta : b.errors24h - a.errors24h;
};

export function ServiceLadder({ limit }: { limit?: number }) {
  const { data } = useObs();
  const services = [...(data?.services ?? [])].sort(byRisk);
  if (services.length === 0)
    return (
      <ObsEmpty
        icon={ServerOff}
        title="سرویسی زیر نظر نیست"
        hint="فهرست سرویس‌ها از تعریف زیرساخت می‌آید و وضعیت هرکدام از لاگ‌های همان منبع محاسبه می‌شود."
      />
    );
  const rows = typeof limit === 'number' ? services.slice(0, limit) : services;

  return (
    <div className={s.serviceTable}>
      <div className={s.serviceTableHead}>
        <span>سرویس و وضعیت</span>
        <span>روند ۲۴ ساعت</span>
        <span>شاخص‌ها</span>
        <span>عملیات</span>
      </div>
      <ul className={s.ladder}>
        {rows.map((service, index) => {
          const tone = STATUS_TONE[service.status] ?? 'idle';
          const max = Math.max(...service.sparkline, 1);
          return (
            <li key={service.id} className={s.ladderRow} data-tone={tone}>
              <span className={s.ladderRank}>۰{index + 1}</span>
              <span className={s.ladderDot} aria-hidden />
              <span className={s.ladderName}>
                <Link href={service.href} className={s.ladderTitle}>
                  {service.name}
                </Link>
                <span className={s.ladderDesc}>{service.desc}</span>
                <span className={s.ladderStatus}>
                  {STATUS_LABEL[service.status] ?? service.status}
                </span>
              </span>
              <span className={s.ladderSpark} aria-label="روند ساعتی" aria-hidden="true">
                {service.sparkline.map((value, sparkIndex) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: sparkline positional — index is identity
                    key={sparkIndex}
                    className={s.sparkBar}
                    style={{ blockSize: `${ratio(value, max, 6)}%` }}
                  />
                ))}
              </span>
              <span className={s.ladderNums}>
                <span>
                  <small>تأخیر</small>
                  <strong>{msShort(service.latencyMs)}</strong>
                </span>
                <span>
                  <small>دسترس‌پذیری</small>
                  <strong>{faPercent(service.uptime24h, 2)}</strong>
                </span>
                <span>
                  <small>خطا</small>
                  <strong>{faNum(service.errors24h)}</strong>
                </span>
              </span>
              <Link
                href={service.href}
                className={s.ladderOpen}
                aria-label={`باز کردن ${service.name}`}
              >
                <ArrowUpLeft size={15} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
=======
import { areaPath, axisPercent, linePath } from './chart';
import { cssVars, faNum, faPercent, msShort, statusLabel, statusTone } from './format';
import { ObsEmpty } from './ObsSection';
import { useObs } from './ObsProvider';
import l from './ledger.module.css';

/** ترتیب ریسک — کوچک‌تر یعنی فوری‌تر. */
const RISK: Record<string, number> = { down: 0, degraded: 1, healthy: 2, idle: 3 };

const SPARK_W = 120;
const SPARK_H = 32;

interface ServiceLadderProps {
  /** سقف تعداد ردیف؛ نبودنش یعنی همه. */
  limit?: number;
}

/**
 * نردبان سرویس‌ها.
 *
 * چرا نردبان و نه شبکهٔ کارت: کاربر اینجا **مقایسه** می‌کند، و مقایسه در
 * ستون‌های هم‌تراز اتفاق می‌افتد نه در کارت‌های پراکنده. مرتب‌سازی هم بر
 * اساس ریسک است نه الفبا؛ آنچه آتش گرفته همیشه بالای فهرست است.
 *
 * کل ردیف یک لینک است تا هدف لمسی به اندازهٔ کل سطر باشد، نه یک فلش ۱۶ پیکسلی.
 */
export function ServiceLadder({ limit }: ServiceLadderProps) {
  const { data, hour, windowHours } = useObs();

  const services = [...(data?.services ?? [])].sort((a, b) => {
    const risk = (RISK[a.status] ?? 9) - (RISK[b.status] ?? 9);
    if (risk !== 0) return risk;
    if (b.errors24h !== a.errors24h) return b.errors24h - a.errors24h;
    return b.events24h - a.events24h;
  });

  const shown = limit ? services.slice(0, limit) : services;

  if (shown.length === 0) {
    return (
      <ObsEmpty
        icon={ServerCog}
        title="هیچ سرویسی خوانده نشد"
        hint="یا هنوز خوانشی نرسیده یا جمع‌آورندهٔ لاگ خاموش است. نوار وضعیت بالای صفحه تازگی داده را می‌گوید."
      />
    );
  }

  const cursor = `${axisPercent(hour, windowHours)}%`;
  const geo = { width: SPARK_W, height: SPARK_H, max: 100, padding: 2 };

  return (
    <ol className={l.ladder}>
      {shown.map((service) => {
        const tone = statusTone(service.status);
        const quiet = service.events24h === 0;

        return (
          <li key={service.id}>
            <Link href={service.href} className={l.row} data-tone={tone}>
              <span className={l.rank} aria-hidden="true" />

              <span className={l.identity}>
                <span className={l.pip} aria-hidden="true" />
                <span>
                  <strong className={l.name}>{service.name}</strong>
                  <small className={l.desc}>
                    <span className={l.statusWord}>{statusLabel(service.status)}</span>
                    {' · '}
                    {service.desc}
                  </small>
                </span>
              </span>

              <span className={l.spark} dir="ltr" style={cssVars({ '--cursor': cursor })}>
                {quiet ? null : (
                  <svg
                    viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                    preserveAspectRatio="none"
                    className={l.sparkArt}
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path className={l.sparkArea} d={areaPath(service.sparkline, geo)} />
                    <path className={l.sparkLine} d={linePath(service.sparkline, geo)} />
                  </svg>
                )}
                <span className={l.sparkCursor} aria-hidden="true" />
              </span>

              <dl className={l.figs}>
                <div className={l.figCell}>
                  <dt>تأخیر</dt>
                  <dd>{msShort(service.latencyMs)}</dd>
                </div>
                <div className={l.figCell}>
                  <dt>خطای ۲۴ ساعت</dt>
                  <dd>{faNum(service.errors24h)}</dd>
                </div>
                <div className={l.figCell}>
                  <dt>در دسترس</dt>
                  <dd>{quiet ? '—' : faPercent(service.uptime24h, 2)}</dd>
                </div>
                <div className={l.figCell}>
                  <dt>رویداد</dt>
                  <dd>{faNum(service.events24h)}</dd>
                </div>
              </dl>

              <ArrowLeft className={l.go} size={16} strokeWidth={1.7} aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ol>
>>>>>>> cc577b44f17b1f7d6d64006fdcd7dcb18ca2898f
  );
}
