'use client';

import { ArrowUpLeft, ServerOff } from 'lucide-react';
import Link from 'next/link';

import type { ServiceHealth } from '@/lib/observability';
import { faNum, faPercent, msShort, statusLabel, statusTone } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import { Sparkline } from './Sparkline';
import { StatusGlyph } from './StatusGlyph';
import s from './obs.module.css';

const RISK: Record<string, number> = { down: 0, degraded: 1, healthy: 2, idle: 3 };

const byRisk = (a: ServiceHealth, b: ServiceHealth): number => {
  const delta = (RISK[a.status] ?? 9) - (RISK[b.status] ?? 9);
  return delta !== 0 ? delta : b.errors24h - a.errors24h;
};

/**
 * نردبان سرویس‌ها — پرخطرترین بالا.
 *
 * ردیف است نه کارت: مقایسهٔ عمودی اعداد هم‌ستون کارِ چشم را می‌کند، کارت آن را
 * می‌شکند. نام سرویس به کارنامهٔ اختصاصی‌اش می‌رود و آیکون پرش به مسیر عملیاتی
 * مرتبط (jobs / queries / settings) که خودِ لایهٔ داده تعیین کرده است.
 *
 * نقاطِ داغ ریزنمودار از ماتریس گرمای همان منبع می‌آید، نه از حدس: ساعتی که
 * خطا داشته روی خط علامت می‌خورد.
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
      {rows.map((service) => {
        const tone = statusTone(service.status);
        const heatRow = data?.heat.find((row) => row.source === service.id);
        const marks = heatRow
          ? heatRow.cells.reduce<number[]>((acc, cell, index) => {
              if (cell.errors > 0) acc.push(index);
              return acc;
            }, [])
          : [];

        return (
          <li key={service.id} className={s.ladderRow} data-tone={tone}>
            <StatusGlyph tone={tone} emphasis={tone === 'bad'} />

            <span className={s.ladderName}>
              <Link
                href={`/dashboard/observability/services/${service.id}`}
                className={s.ladderTitle}
              >
                {service.name}
              </Link>
              <span className={s.ladderDesc}>{service.desc}</span>
            </span>

            <Sparkline values={service.sparkline} marks={marks} className={s.ladderSpark} />

            <span className={s.ladderNums}>
              <span className={s.num}>
                <span className={s.numKey}>تأخیر</span>
                <b className={s.numVal}>{msShort(service.latencyMs)}</b>
              </span>
              <span className={s.num}>
                <span className={s.numKey}>در دسترس</span>
                <b className={s.numVal}>{faPercent(service.uptime24h, 2)}</b>
              </span>
              <span className={s.num}>
                <span className={s.numKey}>خطا</span>
                <b className={s.numVal} data-hot={service.errors24h > 0}>
                  {faNum(service.errors24h)}
                </b>
              </span>
              <span className={s.num}>
                <span className={s.numKey}>رویداد</span>
                <b className={s.numVal}>{faNum(service.events24h)}</b>
              </span>
            </span>

            <span className={s.ladderStatus}>{statusLabel(service.status)}</span>

            <Link
              href={service.href}
              className={s.ladderJump}
              aria-label={`مسیر عملیاتی مرتبط با ${service.name}`}
            >
              <ArrowUpLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
