'use client';

import { ServerOff } from 'lucide-react';
import Link from 'next/link';

import type { ServiceHealth } from '@/lib/observability';
import { faNum, faPercent, msShort, ratio } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
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

/** نردبان سرویس‌ها — پرخطرترین بالا. ردیف است، نه کارت. */
export function ServiceLadder({ limit }: { limit?: number }) {
  const { data } = useObs();
  const services = [...(data?.services ?? [])].sort(byRisk);

  if (services.length === 0) {
    return (
      <ObsEmpty
        icon={ServerOff}
        title="سرویسی زیر نظر نیست"
        hint="فهرست سرویس‌ها از تعریف زیرساخت می‌آید و وضعیت هرکدام از لاگ‌های همان منبع محاسبه می‌شود."
      />
    );
  }

  const rows = typeof limit === 'number' ? services.slice(0, limit) : services;

  return (
    <ul className={s.ladder}>
      {rows.map((service) => {
        const tone = STATUS_TONE[service.status] ?? 'idle';
        const max = Math.max(...service.sparkline, 1);

        return (
          <li key={service.id} className={s.ladderRow} data-tone={tone}>
            <span className={s.ladderDot} aria-hidden />

            <span className={s.ladderName}>
              <Link href={service.href} className={s.ladderTitle}>
                {service.name}
              </Link>
              <span className={s.ladderDesc}>{service.desc}</span>
            </span>

            <span className={s.ladderSpark} aria-hidden>
              {service.sparkline.map((value, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: نقاط ساعتی ترتیب ثابت دارند
                  key={index}
                  className={s.sparkBar}
                  style={{ blockSize: `${ratio(value, max, 6)}%` }}
                />
              ))}
            </span>

            <span className={s.ladderNums}>
              <span>
                تأخیر <strong>{msShort(service.latencyMs)}</strong>
              </span>
              <span>
                در دسترس <strong>{faPercent(service.uptime24h, 2)}</strong>
              </span>
              <span>
                خطا <strong>{faNum(service.errors24h)}</strong>
              </span>
            </span>

            <span className={s.ladderStatus}>{STATUS_LABEL[service.status] ?? service.status}</span>
          </li>
        );
      })}
    </ul>
  );
}
