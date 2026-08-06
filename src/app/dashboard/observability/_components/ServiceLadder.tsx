'use client';

import { ServerOff } from 'lucide-react';
import Link from 'next/link';

import type { ServiceHealth } from '@/lib/observability';

import { faNum, faPercent, hourKey, msShort, ratio, statusLabel, statusTone, toFa } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

const RISK: Record<string, number> = { down: 0, degraded: 1, healthy: 2, idle: 3 };

const byRisk = (a: ServiceHealth, b: ServiceHealth): number => {
  const delta = (RISK[a.status] ?? 9) - (RISK[b.status] ?? 9);
  return delta !== 0 ? delta : b.errors24h - a.errors24h;
};

/**
 * نردبان سرویس‌ها — ردیف رتبه‌دار، پرخطرترین بالا.
 *
 * ردیف است نه کارت، و شمارهٔ رتبه سمتِ شروع می‌نشیند تا «ترتیب» خودش یک
 * اطلاعات باشد: خواننده می‌داند فهرست بر اساس ریسک مرتب شده، نه الفبا.
 * وضعیت هم با رنگ و هم با کلمه گفته می‌شود، پس رنگ تنها نشانه نیست.
 */
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
      {rows.map((service, rank) => {
        const max = Math.max(...service.sparkline, 1);

        return (
          <li key={service.id} className={s.ladderRow} data-tone={statusTone(service.status)}>
            <span className={s.ladderRank} aria-hidden="true">
              {toFa(String(rank + 1).padStart(2, '0'))}
            </span>

            <span className={s.ladderName}>
              <Link href={service.href} className={s.ladderTitle}>
                {service.name}
              </Link>
              <span className={s.ladderDesc}>{service.desc}</span>
            </span>

            <span className={s.ladderSpark} aria-hidden="true">
              {service.sparkline.map((value, index) => (
                <span
                  key={hourKey(index)}
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

            <span className={s.ladderStatus}>
              <span className={s.ladderDot} aria-hidden="true" />
              {statusLabel(service.status)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
