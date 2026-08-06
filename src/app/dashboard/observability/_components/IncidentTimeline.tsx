'use client';

import { ShieldCheck } from 'lucide-react';

import { bucketLabel, faNum } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

/**
 * پنجره‌های انفجار خطا.
 *
 * آستانه از خودِ داده می‌آید (سه برابر میانگین ساعتی)، پس روی پروژهٔ کم‌ترافیک و
 * پرترافیک یکسان معنا می‌دهد.
 *
 * چیدمان تازه: همهٔ ردیف‌ها روی یک **خط‌کش مشترک شبانه‌روز** می‌نشینند، پس
 * فاصله و هم‌پوشانی پنجره‌ها بدون خواندن هیچ عددی دیده می‌شود. دکمهٔ هر ردیف
 * مکان‌نمای زمانی را روی اوجِ همان پنجره قفل می‌کند.
 */
export function IncidentTimeline() {
  const { data, setHour, hour, windowHours } = useObs();
  if (!data) return null;

  if (data.incidents.length === 0) {
    return (
      <ObsEmpty
        icon={ShieldCheck}
        title="پنجرهٔ بحرانی نداشتیم"
        hint="هر بازهٔ پیوسته‌ای که نرخ خطایش از سه برابر میانگین شبانه‌روز بگذرد، به‌عنوان incident اینجا ثبت می‌شود."
      />
    );
  }

  return (
    <ul className={s.incidents}>
      {data.incidents.map((incident) => {
        const span = incident.toHour - incident.fromHour + 1;
        const from = bucketLabel(data.generatedAt, incident.fromHour, windowHours).slice(0, 5);
        const to = bucketLabel(data.generatedAt, incident.toHour, windowHours).slice(-5);
        const inside = hour >= incident.fromHour && hour <= incident.toHour;
        const tone = incident.peak >= 10 ? 'bad' : 'warn';

        return (
          <li key={incident.id} className={s.incidentRow} data-tone={tone} data-inside={inside}>
            <button
              type="button"
              className={s.incidentBtn}
              onClick={() => setHour(incident.fromHour)}
              aria-label={`قفل مکان‌نما روی شروع پنجرهٔ ${from} تا ${to}`}
            >
              <span className={s.incidentTitle}>
                {from} تا {to}
              </span>
              <span className={s.incidentMeta}>
                {faNum(incident.errors)} خطا در {faNum(span)} ساعت · اوج {faNum(incident.peak)} در
                ساعت
                {incident.sources.length > 0 ? ` · ${incident.sources.join('، ')}` : ''}
              </span>
            </button>

            <span className={s.ruler} aria-hidden="true">
              <span
                className={s.rulerFill}
                style={{
                  insetInlineStart: `${(incident.fromHour / windowHours) * 100}%`,
                  inlineSize: `${(span / windowHours) * 100}%`,
                }}
              />
              <span
                className={s.rulerCursor}
                style={{ insetInlineStart: `${(hour / Math.max(1, windowHours - 1)) * 100}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
