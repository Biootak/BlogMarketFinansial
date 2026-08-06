'use client';

import { faNum, faPercent } from './format';
import { HealthRing } from './HealthRing';
import { readHealth } from './obsHealth';
import { useObs } from './ObsProvider';
import { RidgeChart } from './RidgeChart';
import { ScopeReadout } from './ScopeReadout';
import { SloRail } from './SloRail';
import { StatusGlyph } from './StatusGlyph';
import { SystemVitals } from './SystemVitals';
import d from './deck.module.css';

/**
 * پوستهٔ فرماندهی — چهار ناحیهٔ نامتقارن که با هم یک جمله می‌سازند:
 *   «حالِ سامانه این است» ← «در شبانه‌روز این‌طور نفس کشیده» ←
 *   «نسبت به هدف کجاییم» ← «اعدادش این‌هاست».
 *
 * چیدمان از موبایل شروع می‌شود (تک‌ستون)، در ۴۸rem دیال و نوار کنار هم
 * می‌نشینند و بودجه تمام‌عرض می‌شود، و در ۸۲rem به سه ستونِ نامساوی
 * (۳ / ۶ / ۳) می‌رسد با بانک نشانه‌ها به‌عنوان ردیف دوم تمام‌عرض.
 * هیچ‌جا سه ناحیهٔ هم‌اندازه نداریم؛ وزن هر ناحیه با اهمیتش تعیین شده.
 */
export function ObsPulseDeck() {
  const { data } = useObs();

  if (!data) {
    return (
      <section className={d.deck} data-tone="idle" aria-label="وضعیت کلی سامانه">
        <p className={d.deckFallback}>
          هنوز خوانشی از سامانه ثبت نشده است. اگر این وضعیت ادامه داشت، دسترسی نشست یا اتصال
          دیتابیس را بررسی کنید.
        </p>
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
    {
      id: 'healthy',
      label: 'سالم',
      value: health.healthy,
      tone: health.healthy > 0 ? 'ok' : 'idle',
    },
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
              <StatusGlyph tone={chip.tone} />
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
            حجم رویداد بالای خط مبنا و خطای همان ساعت آینه‌ای زیر آن. با کلیک یا Tab روی هر ساعت،
            خوانشِ همان بازه در همهٔ بلوک‌های صفحه قفل می‌شود.
          </p>
        </div>

        <RidgeChart />
        <ScopeReadout layout="row" />
      </div>

      <div className={d.deckBudget}>
        <SloRail />
      </div>

      <div className={d.deckVitals}>
        <SystemVitals />
      </div>
    </section>
  );
}
