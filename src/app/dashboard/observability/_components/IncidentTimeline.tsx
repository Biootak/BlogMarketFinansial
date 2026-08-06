'use client';

import { ShieldCheck } from 'lucide-react';

import { faNum, hourRange } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

/**
 * پنجره‌های انفجار خطا. آستانه از خودِ داده می‌آید (سه برابر میانگین ساعتی)،
 * پس روی پروژهٔ کم‌ترافیک و پرترافیک یکسان معنا می‌دهد.
 */
export function IncidentTimeline() {
  const { data } = useObs();
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

  const hours = data.windowHours;

  return (
    <ul className={s.incidents}>
      {data.incidents.map((incident) => {
        const span = incident.toHour - incident.fromHour + 1;
        const from = hourRange(data.generatedAt, incident.fromHour, hours).start;
        const to = hourRange(data.generatedAt, incident.toHour, hours).end;

        return (
          <li key={incident.id} className={s.incidentRow}>
            <span>
              <span className={s.incidentTitle}>
                {from} تا {to}
              </span>
              <span className={s.incidentMeta}>
                {faNum(incident.errors)} خطا در {faNum(span)} ساعت
                {incident.sources.length > 0 ? ` · ${incident.sources.join('، ')}` : ''}
              </span>
            </span>
            <span className={s.incidentPeak}>{faNum(incident.peak)}</span>
            <span className={s.span} aria-hidden>
              <span
                className={s.spanFill}
                style={{
                  insetInlineStart: `${(incident.fromHour / hours) * 100}%`,
                  inlineSize: `${(span / hours) * 100}%`,
                }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
