'use client';

/**
 * HoursMatrix — یک جدول ۷×۲ برای ساعت کاری هفتگی.
 *
 *   الگو از trading-desk terminals — هر روز یک ردیف با:
 *     - day badge
 *     - دو time input (open/close) به‌صورت native time input
 *     - یک toggle "تعطیل" که دو input را غیرفعال می‌کند
 *
 *   رویداد onChange(row, value) — value شامل {open, close, closed} است.
 */

import { Clock, Moon } from 'lucide-react';

import { TimePicker } from '@/components/ui/time-picker';

import s from './HoursMatrix.module.css';

export interface HoursValue {
  open: string;
  close: string;
  closed: boolean;
}

const DAYS: ReadonlyArray<{ key: string; label: string; sub: string }> = [
  { key: 'sat', label: 'شنبه', sub: 'Sat' },
  { key: 'sun', label: 'یکشنبه', sub: 'Sun' },
  { key: 'mon', label: 'دوشنبه', sub: 'Mon' },
  { key: 'tue', label: 'سه‌شنبه', sub: 'Tue' },
  { key: 'wed', label: 'چهارشنبه', sub: 'Wed' },
  { key: 'thu', label: 'پنجشنبه', sub: 'Thu' },
  { key: 'fri', label: 'جمعه', sub: 'Fri' },
];

interface Props {
  /** map از dayKey → HoursValue */
  value: Record<string, HoursValue>;
  /** callback برای تغییر یک ردیف */
  onChange: (dayKey: string, value: HoursValue) => void;
  /** غیرفعال‌سازی کلی (read-only) */
  disabled?: boolean;
}

export function HoursMatrix({ value, onChange, disabled }: Props) {
  // محاسبه مجموع ساعات باز در هفته
  const totalOpenHours = DAYS.reduce((acc, d) => {
    const v = value[d.key];
    if (!v || v.closed || !v.open || !v.close) return acc;
    const [oh, om] = v.open.split(':').map(Number);
    const [ch, cm] = v.close.split(':').map(Number);
    if (Number.isNaN(oh) || Number.isNaN(ch)) return acc;
    const open = oh + om / 60;
    const close = ch + cm / 60;
    return acc + Math.max(0, close - open);
  }, 0);

  const openDays = DAYS.filter((d) => value[d.key] && !value[d.key].closed).length;

  return (
    <div className={s.root}>
      <header className={s.head}>
        <div className={s.headTitle}>
          <Clock size={14} strokeWidth={2} aria-hidden />
          <span>ساعات کاری هفتگی</span>
        </div>
        <div className={s.headMeta}>
          <span className={s.metaCell}>
            <span className={s.metaLabel}>روز فعال</span>
            <span className={s.metaValue}>
              {toFa(openDays)}
              <span className={s.metaDim}>/{toFa(7)}</span>
            </span>
          </span>
          <span className={s.metaSep} aria-hidden />
          <span className={s.metaCell}>
            <span className={s.metaLabel}>مجموع ساعت</span>
            <span className={s.metaValue}>
              {toFa(Math.round(totalOpenHours))}
              <span className={s.metaDim}>ساعت</span>
            </span>
          </span>
        </div>
      </header>

      <div className={s.grid} role="grid" aria-label="ساعت کاری هفتگی">
        {/* column headers — desktop only */}
        <div className={s.colHead} role="presentation" />
        <div className={s.colHead} role="columnheader">
          <span>ساعت شروع</span>
        </div>
        <div className={s.colHead} role="columnheader">
          <span>ساعت پایان</span>
        </div>
        <div className={s.colHead} role="columnheader">
          <span>وضعیت</span>
        </div>

        {DAYS.map((d) => {
          const v = value[d.key] ?? { open: '08:00', close: '16:00', closed: false };
          const isWeekend = d.key === 'fri';
          return (
            <DayRow
              key={d.key}
              label={d.label}
              sub={d.sub}
              highlight={isWeekend}
              value={v}
              disabled={disabled}
              onChange={(nv) => onChange(d.key, nv)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DayRowProps {
  label: string;
  sub: string;
  highlight?: boolean;
  value: HoursValue;
  disabled?: boolean;
  onChange: (v: HoursValue) => void;
}

function DayRow({ label, sub, highlight, value, disabled, onChange }: DayRowProps) {
  const toggleBtn = (
    <button
      type="button"
      role="switch"
      aria-checked={!value.closed}
      disabled={disabled}
      onClick={() => onChange({ ...value, closed: !value.closed })}
      className={`${s.toggle} ${value.closed ? s.toggleOff : s.toggleOn}`}
    >
      {value.closed ? (
        <>
          <Moon size={11} strokeWidth={2} aria-hidden />
          <span>تعطیل</span>
        </>
      ) : (
        <>
          <span className={s.toggleDot} aria-hidden />
          <span>باز</span>
        </>
      )}
    </button>
  );

  return (
    <>
      {/* ── Desktop cells (grid columns) ── */}
      <div className={`${s.dayCell} ${highlight ? s.dayCellHi : ''}`}>
        <span className={s.dayLabel}>{label}</span>
        <span className={s.daySub}>{sub}</span>
      </div>
      <div className={s.inputCell}>
        <TimePicker
          value={value.open}
          onChange={(t) => onChange({ ...value, open: t })}
          disabled={disabled || value.closed}
          aria-label={`ساعت شروع ${label}`}
          className={s.timeInput}
        />
      </div>
      <div className={s.inputCell}>
        <TimePicker
          value={value.close}
          onChange={(t) => onChange({ ...value, close: t })}
          disabled={disabled || value.closed}
          aria-label={`ساعت پایان ${label}`}
          className={s.timeInput}
        />
      </div>
      <div className={s.statusCell}>{toggleBtn}</div>

      {/* ── Mobile card (flex stack) ── */}
      <div className={`${s.dayRow} ${highlight ? s.dayRowHi : ''}`}>
        <div className={s.dayRowTop}>
          <div>
            <span className={s.dayLabel}>{label}</span>
            <span className={s.daySub}> · {sub}</span>
          </div>
          {toggleBtn}
        </div>
        {!value.closed && (
          <div className={`${s.dayRowInputs} ${disabled ? s.inputDisabled : ''}`}>
            <div>
              <div className={s.dayRowInputLabel}>شروع</div>
              <TimePicker
                value={value.open}
                onChange={(t) => onChange({ ...value, open: t })}
                disabled={disabled}
                aria-label={`ساعت شروع ${label}`}
                className={s.timeInput}
              />
            </div>
            <div>
              <div className={s.dayRowInputLabel}>پایان</div>
              <TimePicker
                value={value.close}
                onChange={(t) => onChange({ ...value, close: t })}
                disabled={disabled}
                aria-label={`ساعت پایان ${label}`}
                className={s.timeInput}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function toFa(n: number): string {
  return new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(n);
}
