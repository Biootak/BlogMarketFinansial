/**
 * verdict.ts — تنها جایی که به سؤال «چیزی خراب است؟» پاسخ داده می‌شود.
 * ─────────────────────────────────────────────────────────────
 *  تحقیق ۲۰۲۶ (SRE dashboard design / RED method) یک معیار روشن دارد:
 *  داشبورد باید در کمتر از پنج ثانیه بگوید «سالم» یا «کجا آتش گرفته».
 *  پس به‌جای پخش کردن منطق سلامت در چند کامپوننت، یک تابع خالص داریم که
 *  هم ریل نشانه‌های حیاتی و هم هدر hero و هم رنگ کل صفحه را تغذیه می‌کند.
 *
 *  رنگ صفحه از همین verdict می‌آید — یعنی رنگ «اطلاعات» است نه تزئین.
 */

import type { ObservabilitySnapshot } from '@/lib/observability';

import { faNum, faPercent } from './format';

export type VerdictTone = 'ok' | 'warn' | 'bad' | 'idle';

export interface Verdict {
  tone: VerdictTone;
  /** یک کلمه — همان چیزی که از دو متر فاصله خوانده می‌شود. */
  label: string;
  /** یک جمله که می‌گوید چه اتفاقی افتاده. */
  headline: string;
  /** یک جمله که می‌گوید قدم بعدی چیست. */
  action: string;
  down: number;
  degraded: number;
  active: number;
}

/** آستانهٔ نرخ خطایی که «تحت فشار» محسوب می‌شود (درصد). */
const PRESSURE_ERROR_RATE = 2;

export function computeVerdict(data: ObservabilitySnapshot | null): Verdict {
  if (!data) {
    return {
      tone: 'idle',
      label: 'بدون خوانش',
      headline: 'هنوز هیچ خوانشی از سامانه نرسیده است.',
      action: 'اگر این وضعیت ادامه داشت، دسترسی نشست یا اتصال دیتابیس را بررسی کنید.',
      down: 0,
      degraded: 0,
      active: 0,
    };
  }

  const down = data.services.filter((service) => service.status === 'down').length;
  const degraded = data.services.filter((service) => service.status === 'degraded').length;
  const idle = data.services.filter((service) => service.status === 'idle').length;
  const active = data.services.length - idle;
  const { errorRate } = data.performance;

  if (down > 0) {
    return {
      tone: 'bad',
      label: 'ناپایدار',
      headline: `${faNum(down)} سرویس خارج از سرویس است.`,
      action: 'از نردبان سرویس‌ها شروع کنید؛ پرخطرترین ردیف بالای فهرست است.',
      down,
      degraded,
      active,
    };
  }

  if (degraded > 0 || errorRate > PRESSURE_ERROR_RATE) {
    return {
      tone: 'warn',
      label: 'تحت فشار',
      headline:
        degraded > 0
          ? `${faNum(degraded)} سرویس کند شده و نرخ خطا ${faPercent(errorRate)} است.`
          : `نرخ خطای ساعت اخیر ${faPercent(errorRate)} است — بالاتر از آستانهٔ عادی.`,
      action: 'پنجره‌های بحرانی را ببینید تا بفهمید فشار از کدام ساعت شروع شده.',
      down,
      degraded,
      active,
    };
  }

  if (data.totals.logs === 0) {
    return {
      tone: 'idle',
      label: 'بی‌صدا',
      headline: 'در پنجرهٔ جاری هیچ لاگی ثبت نشده است.',
      action: 'یا ترافیکی نبوده یا جمع‌آورندهٔ لاگ خاموش است — هر دو ارزش بررسی دارد.',
      down,
      degraded,
      active,
    };
  }

  return {
    tone: 'ok',
    label: 'پایدار',
    headline: `${faNum(active)} سرویس فعال، بدون قطعی در پنجرهٔ جاری.`,
    action: 'چیزی برای رسیدگی نیست؛ همین صفحه هر نیم دقیقه خودش را تازه می‌کند.',
    down,
    degraded,
    active,
  };
}
