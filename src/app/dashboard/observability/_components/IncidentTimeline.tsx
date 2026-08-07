'use client';

import { Siren } from 'lucide-react';

import { bucketLabel, cssVars, faNum, sourceName } from './format';
import { ObsEmpty } from './ObsSection';
import { useObs } from './ObsProvider';
import l from './ledger.module.css';

/**
 * پنجره‌های بحرانی.
 *
 * «پنجره» یک بازهٔ پیوسته است که نرخ خطایش از سه برابر میانگین پنجره رد شده
 * (آستانه در `src/lib/observability.ts` تعریف می‌شود، نه اینجا؛ یک منبع حقیقت).
 *
 * محور LTR است مثل بقیهٔ سری‌های زمانی، و هر بازه یک دکمهٔ واقعی است: کلیک
 * روی آن مکان‌نمای ساعتِ مشترک را روی اوجِ همان بازه می‌برد، پس نوار سیگنال،
 * ماتریس گرما و نوار روز همگی به همان لحظه می‌پرند.
 */
export function IncidentTimeline() {
  const { data, hour, windowHours, setHour } = useObs();
  const incidents = data?.incidents ?? [];

  if (!data || incidents.length === 0) {
    return (
      <ObsEmpty
        icon={Siren}
        title="پنجرهٔ بحرانی‌ای پیدا نشد"
        hint="در هیچ ساعتی از این بازه، نرخ خطا سه برابر میانگین نشده است. یعنی فشار پخش بوده، نه متمرکز."
      />
    );
  }

  /** ساعتِ اوج یک بازه — همان سطلی که بیشترین خطا را دارد. */
  const peakHourOf = (from: number, to: number): number => {
    let best = from;
    for (let index = from; index <= to; index += 1) {
      if ((data.hourlyErrors[index] ?? 0) > (data.hourlyErrors[best] ?? 0)) best = index;
    }
    return best;
  };

  return (
    <div className={l.incidents}>
      <div className={l.incidentAxis} dir="ltr">
        {incidents.map((incident) => {
          const from = (incident.fromHour / windowHours) * 100;
          const width = ((incident.toHour - incident.fromHour + 1) / windowHours) * 100;
          const peak = peakHourOf(incident.fromHour, incident.toHour);

          return (
            <button
              key={incident.id}
              type="button"
              className={l.incidentSpan}
              data-selected={hour >= incident.fromHour && hour <= incident.toHour ? 'true' : undefined}
              style={cssVars({ '--from': `${from.toFixed(2)}%`, '--width': `${width.toFixed(2)}%` })}
              onClick={() => setHour(peak)}
              aria-label={`پرش به اوج بازهٔ ${bucketLabel(data.generatedAt, incident.fromHour, windowHours)}`}
            />
          );
        })}
      </div>

      <ol className={l.incidentList}>
        {incidents.map((incident) => (
          <li key={incident.id}>
            <div className={l.incidentItem}>
              <span className={l.incidentRange}>
                {bucketLabel(data.generatedAt, incident.fromHour, windowHours).slice(0, 5)}
                {' تا '}
                {bucketLabel(data.generatedAt, incident.toHour, windowHours).slice(-5)}
              </span>
              <span className={l.incidentPeak}>اوج {faNum(incident.peak)}</span>
              <span className={l.incidentMeta}>
                <span>{faNum(incident.errors)} خطا در کل بازه</span>
                {incident.sources.length > 0 ? (
                  <span>
                    درگیر:{' '}
                    {incident.sources.map((source) => (
                      <bdi key={source}>{sourceName(source)} </bdi>
                    ))}
                  </span>
                ) : null}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
