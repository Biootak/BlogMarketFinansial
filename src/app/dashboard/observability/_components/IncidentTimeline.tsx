'use client';

import { ShieldCheck } from 'lucide-react';

import { bucketLabel, faNum } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

/**
 * پنجره‌های انفجار خطا. آستانه از خودِ داده می‌آید (سه برابر میانگین ساعتی)،
 * پس روی پروژهٔ کم‌ترافیک و پرترافیک یکسان معنا می‌دهد.
 *
 * هر ردیف بازهٔ خودش را روی یک ریلِ ۲۴ ساعته نشان می‌دهد، با همان قرارداد
 * جهتِ پارتیتور بالای صفحه: قدیمی‌ترین سمت شروع، ساعت جاری سمت پایان.
 */
export function IncidentTimeline() {
  const { data, windowHours } = useObs();
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

        return (
          <li key={incident.id} className={s.incidentRow}>
            <span className={s.incidentText}>
              <span className={s.incidentTitle}>
                {from} تا {to}
              </span>
              <span className={s.incidentMeta}>
                {faNum(incident.errors)} خطا در {faNum(span)} ساعت
                {incident.sources.length > 0 ? ` · ${incident.sources.join('، ')}` : ''}
              </span>
            </span>

            <span className={s.incidentPeak}>
              <span className={s.incidentPeakVal}>{faNum(incident.peak)}</span>
              <span className={s.incidentPeakKey}>اوج ساعتی</span>
            </span>

            <span className={s.span} aria-hidden="true">
              <span
                className={s.spanFill}
                style={{
                  insetInlineStart: `${(incident.fromHour / windowHours) * 100}%`,
                  inlineSize: `${(span / windowHours) * 100}%`,
                }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
