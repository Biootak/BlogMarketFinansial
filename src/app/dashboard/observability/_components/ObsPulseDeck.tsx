'use client';

import type { ServiceHealth } from '@/lib/observability';

import { faNum, faPercent, statusLabel, statusTone } from './format';
import { HealthArc } from './HealthArc';
import { readHealth } from './obsHealth';
import { useObs } from './ObsProvider';
import d from './deck.module.css';

/**
 * سرلوحهٔ حکم — «حال سامانه» به‌صورت یک جملهٔ خوانا، نه شبکه‌ای از کارت عدد.
 *
 * چیدمان عمداً نامتقارن است: ستون روایت (حکم + دلیل + فرمول) وزن بیشتری از
 * ستون ابزار (کمان) دارد، چون خواننده اول باید بفهمد «چه خبر است» و بعد
 * «چقدر». فهرست سرویس‌ها یک نوار پیوسته با جداکنندهٔ مویی است تا ۹ سرویس در
 * یک نگاه دیده شوند بدون اینکه به ۹ کارت هم‌اندازه تبدیل شوند.
 *
 * هیچ عددی اینجا تخمینی یا نمایشی نیست؛ همه از snapshot دیتابیس می‌آید.
 */

const RISK: Record<string, number> = { down: 0, degraded: 1, healthy: 2, idle: 3 };

const byRisk = (a: ServiceHealth, b: ServiceHealth): number => {
  const delta = (RISK[a.status] ?? 9) - (RISK[b.status] ?? 9);
  return delta !== 0 ? delta : b.errors24h - a.errors24h;
};

/**
 * در دسترس بودن از ۹۰٪ به بالا محاسبه می‌شود (کفِ محاسبهٔ لایهٔ داده)، پس
 * مقیاس نوار هم از ۹۰ شروع می‌شود؛ وگرنه همهٔ نوارها تقریباً پر دیده می‌شدند و
 * تفاوت معنادار پنهان می‌ماند.
 */
const uptimeFill = (uptime: number): number =>
  Math.max(3, Math.min(100, Math.round((uptime - 90) * 10)));

export function ObsPulseDeck() {
  const { data } = useObs();

  if (!data) {
    return (
      <section className={d.deck} data-tone="idle" aria-label="حکم کلی سامانه">
        <p className={d.deckFallback}>هنوز خوانشی از سامانه ثبت نشده است.</p>
      </section>
    );
  }

  const health = readHealth(data);
  const roster = [...data.services].sort(byRisk);

  return (
    <section className={d.deck} data-tone={health.tone} aria-label="حکم کلی سامانه">
      <div>
        <p className={d.verdictTag}>
          <span className={d.verdictDot} aria-hidden="true" />
          {health.label}
        </p>

        <p className={d.verdictLine}>
          <span className={d.verdictScore}>{health.silent ? '—' : faNum(health.score)}</span>
          <span className={d.verdictOf}>{health.silent ? 'بدون خوانش' : 'از ۱۰۰'}</span>
          <span>شاخص ترکیبی سلامت در پنجرهٔ {faNum(data.windowHours)} ساعت</span>
        </p>

        <p className={d.deckNote}>{health.note}</p>

        <p className={d.deckFormula}>
          ترکیب: {faPercent(40, 0)} در دسترس بودن سرویس‌های دیده‌شده (
          {faPercent(health.availability, 2)}) · {faPercent(35, 0)} نرخ خطای ساعت اخیر (
          {faPercent(data.performance.errorRate)}) · {faPercent(25, 0)} پایداری ساختاری (
          {faNum(health.down)} قطع، {faNum(health.degraded)} کند)
        </p>
      </div>

      <HealthArc score={health.score} tone={health.tone} unknown={health.silent} />

      <ul className={d.roster}>
        {roster.map((service) => {
          const observed = service.status !== 'idle';
          return (
            <li key={service.id} className={d.rosterItem} data-tone={statusTone(service.status)}>
              <span className={d.rosterHead}>
                <span className={d.rosterDot} aria-hidden="true" />
                <span className={d.rosterName} title={service.name}>
                  {service.name}
                </span>
              </span>

              <span className={d.rosterState}>
                {statusLabel(service.status)}
                {observed ? ` · ${faPercent(service.uptime24h, 2)}` : null}
              </span>

              {observed ? (
                <span className={d.rosterTrack} aria-hidden="true">
                  <span
                    className={d.rosterFill}
                    style={{ inlineSize: `${uptimeFill(service.uptime24h)}%` }}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
