'use client';

import { faNum, faPercent } from './format';
import { HealthRing } from './HealthRing';
import { readHealth } from './obsHealth';
import { useObs } from './ObsProvider';
import { RidgeChart } from './RidgeChart';
import { SystemVitals } from './SystemVitals';
import d from './deck.module.css';

/**
 * پوستهٔ فرماندهی — سه ناحیهٔ نامتقارن که با هم یک جمله می‌سازند:
 *   «حال سامانه این است» ← «در شبانه‌روز این‌طور نفس کشیده» ← «اعدادش این‌هاست».
 *
 * چیدمان از موبایل شروع می‌شود (تک‌ستون، حلقه بالا)، در ۵۴rem به دو ستون و در
 * ۸۲rem به سه ستونِ نامساوی می‌رسد. هیچ‌جا سه کارت هم‌اندازه نداریم؛ وزن هر
 * ناحیه با اهمیتش تعیین شده نه با تقارن.
 */
export function ObsPulseDeck() {
  const { data } = useObs();

  if (!data) {
    return (
      <section className={d.deck} data-tone="idle" aria-label="وضعیت کلی سامانه">
        <p className={d.deckFallback}>هنوز خوانشی از سامانه ثبت نشده است.</p>
      </section>
    );
  }

  const health = readHealth(data);

  const chips = [
    { id: 'down', label: 'قطع', value: health.down, tone: health.down > 0 ? 'bad' : 'idle' },
    {
      id: 'degraded',
      label: 'کند',
      value: health.degraded,
      tone: health.degraded > 0 ? 'warn' : 'idle',
    },
    { id: 'healthy', label: 'سالم', value: health.healthy, tone: health.healthy > 0 ? 'ok' : 'idle' },
    { id: 'idle', label: 'بی‌ترافیک', value: health.idle, tone: 'idle' },
  ] as const;

  return (
    <section className={d.deck} data-tone={health.tone} aria-label="وضعیت کلی سامانه">
      <span className={d.deckEdge} aria-hidden="true" />

      <div className={d.deckVerdict}>
        <HealthRing
          score={health.score}
          tone={health.tone}
          label={health.label}
          unknown={health.silent}
        />
        <p className={d.deckNote}>{health.note}</p>

        <ul className={d.chips}>
          {chips.map((chip) => (
            <li key={chip.id} className={d.chip} data-tone={chip.tone}>
              <b>{faNum(chip.value)}</b>
              <span>{chip.label}</span>
            </li>
          ))}
        </ul>

        <p className={d.deckFormula}>
          شاخص ترکیبی: ۴۰٪ در دسترس بودن ({faPercent(health.availability, 2)}) · ۳۵٪ نرخ خطا (
          {faPercent(data.performance.errorRate)}) · ۲۵٪ پایداری سرویس‌ها
        </p>
      </div>

      <div className={d.deckFlow}>
        <div className={d.deckFlowHead}>
          <h2 className={d.deckFlowTitle}>نفسِ شبانه‌روز</h2>
          <p className={d.deckFlowHint}>
            خط‌الرأس، حجم رویداد هر ساعت است و بندِ سرخ زیرش سهم خطا. با کلیک یا Tab روی هر ساعت،
            خوانش همان بازه باز می‌شود.
          </p>
        </div>
        <RidgeChart />
      </div>

      <div className={d.deckVitals}>
        <SystemVitals />
      </div>
    </section>
  );
}
