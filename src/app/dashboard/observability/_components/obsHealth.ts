/**
 * obsHealth.ts — تنها جایی که «حال سامانه» از snapshot استخراج می‌شود.
 * ─────────────────────────────────────────────────────────────
 *  هم deck و هم InsightStack از همین خروجی می‌خوانند تا دو جای صفحه دو حرف
 *  متفاوت نزنند.
 *
 *  شاخص سلامت یک ترکیب صادقانه است، نه عددِ تزئینی:
 *    ۴۰٪ میانگین در دسترس بودن سرویس‌های دیده‌شده (uptime24h واقعی)
 *    ۳۵٪ نرخ خطای ساعت اخیر (هر ۱٪ خطا ۸ امتیاز جریمه)
 *    ۲۵٪ پایداری ساختاری (هر سرویس قطع ۲۸ و هر سرویس کند ۱۱ امتیاز جریمه)
 *  اگر هیچ لاگی در پنجره نباشد اصلاً امتیاز نمی‌دهیم؛ «بی‌صدا» یعنی نمی‌دانیم،
 *  نه یعنی سالم.
 */

import type { ObservabilitySnapshot } from '@/lib/observability';

import { faNum, faPercent, type ToneKey } from './format';

export interface HealthReading {
  /** ۰..۱۰۰ — وقتی `silent` است بی‌معناست و UI نباید نمایشش دهد. */
  score: number;
  tone: ToneKey;
  label: string;
  note: string;
  down: number;
  degraded: number;
  healthy: number;
  idle: number;
  /** میانگین uptime سرویس‌هایی که ترافیک داشته‌اند. */
  availability: number;
  /** سهم خطا از کل حجم پنجره (درصد). */
  errorShare: number;
  peakHour: number;
  peakValue: number;
  quietHour: number;
  /** هیچ لاگی در پنجره ثبت نشده — یعنی داده نداریم، نه اینکه همه‌چیز خوب است. */
  silent: boolean;
}

export function readHealth(data: ObservabilitySnapshot): HealthReading {
  const services = data.services;
  const down = services.filter((service) => service.status === 'down').length;
  const degraded = services.filter((service) => service.status === 'degraded').length;
  const healthy = services.filter((service) => service.status === 'healthy').length;
  const idle = services.filter((service) => service.status === 'idle').length;

  const observed = services.filter((service) => service.status !== 'idle');
  const availability =
    observed.length > 0
      ? observed.reduce((sum, service) => sum + service.uptime24h, 0) / observed.length
      : 100;

  const errorRate = data.performance.errorRate;
  const errorShare = data.totals.logs > 0 ? (data.totals.errors / data.totals.logs) * 100 : 0;
  const stability = Math.max(0, 100 - (down * 28 + degraded * 11));
  const errorScore = Math.max(0, 100 - Math.min(100, errorRate * 8));
  const silent = data.totals.logs === 0;

  const score = silent
    ? 0
    : Math.max(
        0,
        Math.min(100, Math.round(availability * 0.4 + errorScore * 0.35 + stability * 0.25)),
      );

  let peakHour = 0;
  let quietHour = 0;
  for (let index = 1; index < data.hourly.length; index += 1) {
    if ((data.hourly[index] ?? 0) > (data.hourly[peakHour] ?? 0)) peakHour = index;
    if ((data.hourly[index] ?? 0) < (data.hourly[quietHour] ?? 0)) quietHour = index;
  }

  const tone: ToneKey =
    down > 0 ? 'bad' : degraded > 0 || errorRate > 2 ? 'warn' : silent ? 'idle' : 'ok';

  const label =
    down > 0
      ? 'ناپایدار'
      : degraded > 0 || errorRate > 2
        ? 'تحت فشار'
        : silent
          ? 'بی‌صدا'
          : 'پایدار';

  const note =
    down > 0
      ? `${faNum(down)} سرویس خارج از سرویس است و باید همین حالا رسیدگی شود.`
      : degraded > 0
        ? `${faNum(degraded)} سرویس کند شده و نرخ خطای ساعت اخیر ${faPercent(errorRate)} است.`
        : errorRate > 2
          ? `سرویسی نیفتاده ولی نرخ خطای ساعت اخیر ${faPercent(errorRate)} است.`
          : silent
            ? 'در پنجرهٔ جاری هیچ لاگی ثبت نشده؛ یا ترافیکی نبوده یا جمع‌آورنده خاموش است.'
            : `${faNum(healthy)} سرویس فعال و بدون قطعی، با میانگین در دسترس بودن ${faPercent(availability, 2)}.`;

  return {
    score,
    tone,
    label,
    note,
    down,
    degraded,
    healthy,
    idle,
    availability,
    errorShare,
    peakHour,
    peakValue: data.hourly[peakHour] ?? 0,
    quietHour,
    silent,
  };
}
