'use client';

import { ArrowLeft, ServerCog } from 'lucide-react';
import Link from 'next/link';

import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { areaPath, axisPercent, linePath } from './chart';
import { cssVars, faNum, faPercent, msShort, statusLabel, statusTone } from './format';
import l from './ledger.module.css';

/**
 * ServiceLadder — نردبان سرویس‌ها.
 *
 * ۲۰۲۶-۰۸-۰۷: این فایل با نشانگرهای تعارض merge حل‌نشده
 * (`<<<<<<< HEAD` / `=======` / `>>>>>>>`) کامیت شده بود، یعنی کل مسیر
 * observability اصلاً کامپایل نمی‌شد. نسخهٔ قدیمیِ بالا دو آیکون
 * (`ServerOff`, `ArrowUpLeft`) را هم بدون import استفاده می‌کرد. نسخهٔ
 * `ledger` (پایین) نگه داشته شد چون چیدمان جدول‌واره و توکن‌های تازه را دارد.
 *
 * چرا نردبان و نه شبکهٔ کارت: کاربر اینجا **مقایسه** می‌کند، و مقایسه در
 * ستون‌های هم‌تراز اتفاق می‌افتد نه در کارت‌های پراکنده. مرتب‌سازی هم بر
 * اساس ریسک است نه الفبا؛ آنچه آتش گرفته همیشه بالای فهرست است.
 *
 * کل ردیف یک لینک است تا هدف لمسی به اندازهٔ کل سطر باشد، نه یک فلش ۱۶ پیکسلی.
 */

/** ترتیب ریسک — کوچک‌تر یعنی فوری‌تر. */
const RISK: Record<string, number> = { down: 0, degraded: 1, healthy: 2, idle: 3 };

const SPARK_W = 120;
const SPARK_H = 32;

interface ServiceLadderProps {
  /** سقف تعداد ردیف؛ نبودنش یعنی همه. */
  limit?: number;
}

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
                  {/*
                    قبلاً اینجا همیشه یک عدد نشان داده می‌شد، ولی آن عدد از یک
                    ثابت در SERVICE_DEFS ساخته می‌شد نه از اندازه‌گیری. اگر
                    نمونهٔ واقعی duration= نداریم، «—» صادقانه‌تر از یک عدد
                    خوش‌قیافه است.
                  */}
                  <dd>{service.latencyMeasured ? msShort(service.latencyMs) : '—'}</dd>
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
  );
}
