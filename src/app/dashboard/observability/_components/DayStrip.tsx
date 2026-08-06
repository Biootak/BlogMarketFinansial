'use client';

import { Waves } from 'lucide-react';

import { bucketLabel, faNum, faPercent, ratio } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

export function DayStrip() {
  const { data, hour, setHour } = useObs();
  if (!data) return null;
  const { hourly, hourlyErrors, windowHours, generatedAt } = data;
  const total = hourly.reduce((sum, value) => sum + value, 0);
  if (total === 0) return <ObsEmpty icon={Waves} title="جریانی برای نمایش نیست" hint="به‌محض اینکه SystemLog رکورد بگیرد، حجم هر ساعت اینجا رسم می‌شود." />;
  const max = Math.max(...hourly, 1);
  const selected = hour ?? windowHours - 1;
  const selectedTotal = hourly[selected] ?? 0;
  const selectedErrors = hourlyErrors[selected] ?? 0;
  const selectedRate = selectedTotal > 0 ? (selectedErrors / selectedTotal) * 100 : 0;
  let peakIndex = 0;
  for (let i = 1; i < hourly.length; i += 1) if ((hourly[i] ?? 0) > (hourly[peakIndex] ?? 0)) peakIndex = i;

  return (
    <div className={s.strip}>
      <div className={s.stripMain}>
        <div className={s.stripHeader}><span>شدت رویداد</span><span><i className={s.legendVolume} /> حجم <i className={s.legendError} /> خطا</span></div>
        <div className={s.stripScroller}><ul className={s.stripList}>{hourly.map((value, index) => { const errors = hourlyErrors[index] ?? 0; const label = bucketLabel(generatedAt, index, windowHours); return <li key={index} className={s.stripCol}><button type="button" className={s.stripBtn} data-active={index === selected} aria-pressed={index === selected} aria-label={`${label}، ${faNum(value)} رویداد، ${faNum(errors)} خطا`} onClick={() => setHour(index)} onFocus={() => setHour(index)}><span className={s.stripTrack}><span className={s.stripFill} style={{ blockSize: `${ratio(value, max, 2)}%` }} />{errors > 0 ? <span className={s.stripErr} style={{ blockSize: `${ratio(errors, max, 2)}%` }} /> : null}</span><span className={s.stripTick}>{index % 4 === 0 ? label.slice(0, 5) : ''}</span></button></li>; })}</ul></div>
        <p className={s.stripAxis}><span>{faNum(windowHours)} ساعت پیش</span><span>هم‌اکنون</span></p>
      </div>
      <aside className={s.readout} aria-live="polite"><p className={s.readoutHour}>{bucketLabel(generatedAt, selected, windowHours)}</p><p className={s.readoutValue}>{faNum(selectedTotal)}<span className={s.readoutUnit}>رویداد</span></p><dl className={s.rows}><div className={s.row}><dt className={s.rowKey}>خطا</dt><dd className={s.rowVal} data-tone={selectedErrors > 0 ? 'bad' : 'ok'}>{faNum(selectedErrors)}</dd></div><div className={s.row}><dt className={s.rowKey}>نرخ خطا</dt><dd className={s.rowVal}>{faPercent(selectedRate)}</dd></div><div className={s.row}><dt className={s.rowKey}>سهم از شبانه‌روز</dt><dd className={s.rowVal}>{faPercent((selectedTotal / total) * 100)}</dd></div><div className={s.row}><dt className={s.rowKey}>شلوغ‌ترین ساعت</dt><dd className={s.rowVal}>{bucketLabel(generatedAt, peakIndex, windowHours).slice(0, 5)}</dd></div></dl></aside>
    </div>
  );
}
