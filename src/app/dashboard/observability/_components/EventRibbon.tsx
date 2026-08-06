'use client';

/**
 * EventRibbon — قهرمان صفحهٔ نمای کلی.
 * ─────────────────────────────────────────────────────────────
 *  ۲۴ سطل ساعتی که مستقیم از SystemLog می‌آیند، روی یک محور زمانی واحد.
 *  به‌جای tooltip شناور، یک «قرائت‌گر» ثابت بالای نمودار داریم که با
 *  hover / focus روی هر ساعت به‌روز می‌شود — الگوی osciloscope، نه chart
 *  کلیشه‌ای. کلیک، ساعت را pin می‌کند تا موقع خواندن جدول‌های پایین ثابت بماند.
 *
 *  RTL: چیدمان grid است، نه SVG. ستون اول در RTL سمت راست می‌نشیند، پس
 *  «قدیمی‌ترین در راست، اکنون در چپ» به‌صورت طبیعی و بدون هیچ transform
 *  حاصل می‌شود. هیچ hack با row-reverse لازم نیست.
 *
 *  موبایل: همان محور ۹۰ درجه می‌چرخد و به ۲۴ ردیف افقی تبدیل می‌شود تا
 *  هدف لمسی هر ساعت واقعاً قابل زدن باشد؛ نه یک نمودار کوچک‌شده.
 */

import { Activity, ShieldCheck } from 'lucide-react';
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';

import type { Incident } from '@/lib/observability';
import {
  cssVars,
  formatNumber,
  formatShare,
  hourKey,
  hourOffsetLabel,
  hourOffsetShort,
  ratio,
} from './format';
import s from './EventRibbon.module.css';

interface Props {
  hourly: number[];
  hourlyErrors: number[];
  incidents: Incident[];
}

interface Column {
  key: string;
  index: number;
  offset: number;
  total: number;
  errors: number;
  totalRatio: number;
  errorRatio: number;
  incident: boolean;
  label: string;
}

interface RulerTick {
  key: string;
  column: number;
  label: string;
}

const RULER: RulerTick[] = [
  { key: 'tick-24', column: 1, label: '۲۴ ساعت پیش' },
  { key: 'tick-18', column: 7, label: '۱۸س' },
  { key: 'tick-12', column: 13, label: '۱۲س' },
  { key: 'tick-06', column: 19, label: '۶س' },
  { key: 'tick-00', column: 24, label: 'اکنون' },
];

function buildColumns(
  hourly: number[],
  hourlyErrors: number[],
  incidents: Incident[],
): Column[] {
  const peak = Math.max(...hourly, 1);
  const flagged = new Set<number>();
  for (const incident of incidents) {
    for (let i = incident.fromHour; i <= incident.toHour; i += 1) flagged.add(i);
  }
  return hourly.map((total, index) => {
    const errors = hourlyErrors[index] ?? 0;
    const offset = hourly.length - 1 - index;
    return {
      key: hourKey(index),
      index,
      offset,
      total,
      errors,
      totalRatio: ratio(total, peak),
      errorRatio: ratio(errors, peak),
      incident: flagged.has(index),
      label: hourOffsetShort(offset),
    };
  });
}

export function EventRibbon({ hourly, hourlyErrors, incidents }: Props) {
  const columns = useMemo(
    () => buildColumns(hourly, hourlyErrors, incidents),
    [hourly, hourlyErrors, incidents],
  );
  const lastIndex = Math.max(0, columns.length - 1);
  const [pinned, setPinned] = useState<number>(lastIndex);
  const [hovered, setHovered] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = hovered ?? Math.min(pinned, lastIndex);
  const active = columns[activeIndex] ?? columns[lastIndex];
  const volume = columns.reduce((sum, col) => sum + col.total, 0);
  const faults = columns.reduce((sum, col) => sum + col.errors, 0);

  const focusColumn = useCallback((index: number) => {
    setPinned(index);
    buttons.current[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const max = columns.length - 1;
      let next: number | null = null;
      // RTL: راست = عقب‌تر در زمان، چپ = نزدیک‌تر به اکنون.
      if (event.key === 'ArrowRight') next = Math.max(0, activeIndex - 1);
      else if (event.key === 'ArrowLeft') next = Math.min(max, activeIndex + 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = max;
      if (next === null) return;
      event.preventDefault();
      setHovered(null);
      focusColumn(next);
    },
    [activeIndex, columns.length, focusColumn],
  );

  const incidentOfActive = useMemo(
    () =>
      incidents.find(
        (item) => active !== undefined && active.index >= item.fromHour && active.index <= item.toHour,
      ),
    [incidents, active],
  );

  if (!active) return null;

  const errorShare = active.total > 0 ? (active.errors / active.total) * 100 : 0;

  return (
    <section className={s.ribbon} aria-labelledby="obs-ribbon-title">
      <header className={s.head}>
        <div>
          <h2 id="obs-ribbon-title" className={s.title}>
            <Activity size={16} strokeWidth={1.75} aria-hidden />
            خط زمان رویدادها
          </h2>
          <p className={s.caption}>
            {formatNumber(volume)} رویداد و {formatNumber(faults)} خطا در ۲۴ ساعت گذشته — روی هر
            ساعت بایستید تا جزئیاتش را ببینید.
          </p>
        </div>
        <p className={s.legend}>
          <span className={s.swatchTotal} aria-hidden /> حجم رویداد
          <span className={s.swatchError} aria-hidden /> خطا
        </p>
      </header>

      <output className={s.readout} aria-live="polite">
        <span className={s.stamp}>{hourOffsetLabel(active.offset)}</span>
        <span className={s.metric}>
          <span className={s.metricValue}>{formatNumber(active.total)}</span>
          <span className={s.metricLabel}>رویداد</span>
        </span>
        <span className={s.metric} data-alert={active.errors > 0}>
          <span className={s.metricValue}>{formatNumber(active.errors)}</span>
          <span className={s.metricLabel}>خطا</span>
        </span>
        <span className={s.metric}>
          <span className={s.metricValue}>{formatShare(errorShare)}</span>
          <span className={s.metricLabel}>سهم خطا</span>
        </span>
        {incidentOfActive ? (
          <span className={s.flag}>
            داخل پنجرهٔ رخداد — اوج {formatNumber(incidentOfActive.peak)} خطا در ساعت
          </span>
        ) : null}
      </output>

      {volume === 0 ? (
        <p className={s.quiet}>
          <ShieldCheck size={18} strokeWidth={1.6} aria-hidden />
          هیچ رویدادی در ۲۴ ساعت گذشته در SystemLog ثبت نشده است.
        </p>
      ) : (
        <div className={s.plot}>
          <div className={s.brackets} aria-hidden>
            {incidents.map((incident) => (
              <span
                key={incident.id}
                className={s.bracket}
                style={cssVars({
                  gridColumnStart: incident.fromHour + 1,
                  gridColumnEnd: incident.toHour + 2,
                })}
              />
            ))}
          </div>

          {/* biome-ignore lint/a11y/useSemanticElements: گروه اسکراب با roving tabindex */}
          <div
            className={s.track}
            role="group"
            aria-label="سطل‌های ساعتی رویداد، با کلیدهای جهت جابه‌جا شوید"
            onKeyDown={onKeyDown}
          >
            {columns.map((col) => (
              <button
                key={col.key}
                type="button"
                ref={(node) => {
                  buttons.current[col.index] = node;
                }}
                className={s.col}
                data-active={col.index === activeIndex}
                data-incident={col.incident}
                tabIndex={col.index === Math.min(pinned, lastIndex) ? 0 : -1}
                aria-label={`${hourOffsetLabel(col.offset)}: ${formatNumber(col.total)} رویداد، ${formatNumber(col.errors)} خطا`}
                onClick={() => setPinned(col.index)}
                onFocus={() => setHovered(col.index)}
                onBlur={() => setHovered(null)}
                onPointerEnter={() => setHovered(col.index)}
                onPointerLeave={() => setHovered(null)}
              >
                <span className={s.rowLabel} aria-hidden>
                  {col.label}
                </span>
                <span className={s.slot}>
                  <span
                    className={s.total}
                    style={cssVars({ '--v': col.totalRatio })}
                    aria-hidden
                  />
                  {col.errors > 0 ? (
                    <span
                      className={s.error}
                      style={cssVars({ '--v': col.errorRatio })}
                      aria-hidden
                    />
                  ) : null}
                </span>
              </button>
            ))}
          </div>

          <div className={s.ruler} aria-hidden>
            {RULER.map((tick) => (
              <span key={tick.key} className={s.tick} style={cssVars({ gridColumnStart: tick.column })}>
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
