'use client';

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import { toPersianDigits } from '@/lib/setup/format';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import s from '../jobs.module.css';
import { JobSystemPulse } from './JobSystemPulse';

export interface JobHeroProps {
  health: 'healthy' | 'degraded' | 'critical' | 'idle';
  totalJobs: number;
  completed24h: number;
  failed24h: number;
  /** anchor number — مثلاً throughput ساعت گذشته */
  pulseValue: string;
  pulseUnit: string;
  pulseSub: string;
}

const HEALTH_LABEL: Record<JobHeroProps['health'], string> = {
  healthy: 'سیستم سالم',
  degraded: 'نیاز به توجه',
  critical: 'وضعیت بحرانی',
  idle: 'بیکار',
};

export function JobHero({
  health,
  totalJobs,
  completed24h,
  failed24h,
  pulseValue,
  pulseUnit,
  pulseSub,
}: JobHeroProps) {
  // Live clock — فقط client-side، هیچ hydration mismatch
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  useVisibilityAwareInterval(() => setNow(new Date()), 30_000);

  const clockLabel = now
    ? `${toPersianDigits(now.getHours().toString().padStart(2, '0'))}:${toPersianDigits(now.getMinutes().toString().padStart(2, '0'))}`
    : '--:--';

  const dateLabel = now
    ? new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(now)
    : '';

  return (
    <section className={s.hero} aria-label="مرکز کنترل Job">
      <div className={s.heroAmbient} />

      <div className={s.heroContent}>
        <div className={s.heroEyebrow}>
          <span
            aria-hidden="true"
            className={`${s.heroHealthDot} ${s[`heroHealthDot--${health}`]}`}
          />
          <span>{HEALTH_LABEL[health]}</span>
          <span className={s.heroSep}>·</span>
          <span className={s.heroClock}>{clockLabel}</span>
          <span className={s.heroSep}>·</span>
          <span>{dateLabel}</span>
        </div>

        <h1 className={s.heroTitle}>
          <span className={s.heroTitleLine}>
            مرکز <span className={s.heroAccentText}>کنترل Job</span>
          </span>
          <span className={s.heroTitleLineMuted}>نمای زنده‌ی صف‌ها، خطاها و جریان پردازش</span>
        </h1>

        <p className={s.heroLead}>
          اینجا اتاق فرماندهی سامانه است. هر job که در پس‌زمینه اجرا می‌شود اینجا دیده می‌شود؛ از
          زمان‌بندی و صف تا اجرا، خطا و انتقال به صف مرده. همه چیز از یک نقطه، با یک نگاه.
        </p>

        <div className={s.heroStatRow}>
          <div className={s.heroStat}>
            <span className={s.heroStatLabel}>job های اخیر</span>
            <span className={s.heroStatValue}>{toPersianDigits(totalJobs)}</span>
            <span className={s.heroStatSub}>۱۰۰ مورد آخر</span>
          </div>
          <div className={s.heroStat}>
            <span className={s.heroStatLabel}>تکمیل ۲۴ ساعت</span>
            <span className={s.heroStatValue}>{toPersianDigits(completed24h)}</span>
            <span className={s.heroStatSub}>عملیات موفق</span>
          </div>
          <div className={s.heroStat}>
            <span className={s.heroStatLabel}>خطا ۲۴ ساعت</span>
            <span
              className={
                failed24h > 0 ? `${s.heroStatValue} ${s['heroStatValue--danger']}` : s.heroStatValue
              }
            >
              {toPersianDigits(failed24h)}
            </span>
            <span className={s.heroStatSub}>نیازمند بازبینی</span>
          </div>
        </div>

        <div className={s.heroActions}>
          <Link href="/dashboard/jobs/new" className={s.heroPrimaryAction}>
            ساخت job جدید
            <span aria-hidden="true">←</span>
          </Link>
          <Link href="/dashboard/jobs/dlq" className={s.heroSecondaryAction}>
            صف مرده
          </Link>
          <Link href="/dashboard/jobs/queues" className={s.heroSecondaryAction}>
            مدیریت صف‌ها
          </Link>
        </div>
      </div>

      <div className={s.heroPulse} aria-hidden="true">
        <JobSystemPulse
          value={pulseValue}
          unit={pulseUnit}
          eyebrow="نرخ پردازش"
          sub={pulseSub}
          health={health}
          active={true}
        />
        <div className={s.heroPulseLabel}>
          <span className={s.heroPulseEyebrow}>شاخص کلیدی</span>
          <span className={s.heroPulseValue}>
            {pulseValue}{' '}
            <span className={`${s.heroPulseSub} ${s.heroPulseUnitInline}`}>{pulseUnit}</span>
          </span>
          <span className={s.heroPulseSub}>{pulseSub}</span>
        </div>
      </div>
    </section>
  );
}

export default JobHero;
