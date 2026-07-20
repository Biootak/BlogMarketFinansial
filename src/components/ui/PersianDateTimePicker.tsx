'use client';

/**
 * PersianDateTimePicker
 * ============================================================================
 * دکمهٔ popover که با کلیک، تقویم شمسی + انتخاب‌گر ساعت باز می‌کند.
 * جایگزین `<Input type="datetime-local">` میلادی در فرم پست شده.
 *
 *   - تقویم از `react-multi-date-picker` با calendar=persian و locale=persian_fa
 *   - زمان از plugin `time_picker` (hStep=1, mStep=5)
 *   - نمایش انتخاب به دو خط: تاریخ شمسی (روز هفته + روز + ماه + سال) + ساعت
 *   - quick presets: «۱ ساعت بعد» / «فردا همین ساعت» / «۱ هفتهٔ بعد»
 *   - value: `Date | null` (UTC-agnostic؛ تاریخ+ساعت محلی ذخیره می‌شود)
 *
 * از نظر RTL: popover در سمت راست باز می‌شود (`align="start"`)، تقویم خودش
 * RTL داخلی دارد. دکمهٔ trigger همیشه با `justify-start` و متن راست‌چین
 * نمایش داده می‌شود.
 * ============================================================================
 */

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import * as React from 'react';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { FiClock, FiX } from 'react-icons/fi';
import { HiCalendar } from 'react-icons/hi2';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';

const FA_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

const FA_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const pad = (n: number): string => String(n).padStart(2, '0');

const toPersianDigits = (input: string): string => {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;
  return input.replace(/\d/g, (d) => map[Number(d)] ?? d);
};

interface PersianDateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  /** کمترین تاریخ مجاز (مثلاً امروز). اگر null انتخاب شد، خطای قرمز زیر picker. */
  minDate?: Date | null;
  /** فقط برای نمایش placeholder وقتی خالیه */
  placeholder?: string;
  /** وقتی `true`، quick-preset ها نمایش داده می‌شوند (پیش‌فرض: true). */
  showPresets?: boolean;
  disabled?: boolean;
}

/**
 * تبدیل Date به دو خط فارسی:
 *   خط ۱: "شنبه ۱۳ تیر ۱۴۰۵"
 *   خط ۲: "۱۸:۳۰"
 */
function formatLongFa(date: Date): { dateLine: string; timeLine: string } {
  const obj = new DateObject({ date, calendar: persian, locale: persian_fa });
  const ymd = obj.format('YYYY-MM-DD').split('-').map(Number) as [number, number, number];
  const [jYear, jMonth, jDay] = ymd;
  const monthName = FA_MONTHS[jMonth - 1] ?? '';
  // Date#getDay: 0=Sun..6=Sat. ما شنبه را شروع هفته می‌خواهیم → شنبه=0.
  const faIdx = (date.getDay() + 1) % 7;
  const weekday = FA_WEEKDAYS[faIdx] ?? '';
  const dateLine = `${weekday} ${toPersianDigits(String(jDay))} ${monthName} ${toPersianDigits(String(jYear))}`;
  const timeLine = `${toPersianDigits(pad(date.getHours()))}:${toPersianDigits(pad(date.getMinutes()))}`;
  return { dateLine, timeLine };
}

export function PersianDateTimePicker({
  value,
  onChange,
  className,
  minDate,
  placeholder = 'انتخاب تاریخ و ساعت انتشار',
  showPresets = true,
  disabled = false,
}: PersianDateTimePickerProps) {
  // نسخهٔ DateObject برای react-multi-date-picker (وقتی value داریم)
  const dpValue = React.useMemo<DateObject | undefined>(() => {
    if (!value) return undefined;
    return new DateObject({ date: value, calendar: persian, locale: persian_fa });
  }, [value]);

  const handleChange = React.useCallback(
    (d: DateObject | null) => {
      const next = d?.toDate ? d.toDate() : null;
      onChange(next);
    },
    [onChange],
  );

  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(null);
    },
    [onChange],
  );

  /**
   * quick presets: نسبت به الان (نه به value فعلی)، چون معمولاً کاربر
   * می‌خواهد «از همین الان N واحد بعد» را تنظیم کند.
   */
  const presets = React.useMemo(() => {
    const now = new Date();
    return [
      {
        key: '1h',
        label: '۱ ساعت بعد',
        date: new Date(now.getTime() + 60 * 60_000),
        tone: 'sky',
      },
      {
        key: 'tomorrow',
        label: 'فردا همین ساعت',
        // فردای «همین ساعت» دقیقاً ۲۴ ساعت بعد است؛ ساده و قابل پیش‌بینی.
        date: new Date(now.getTime() + 24 * 60 * 60_000),
        tone: 'amber',
      },
      {
        key: 'nextweek',
        label: '۱ هفتهٔ بعد',
        date: new Date(now.getTime() + 7 * 24 * 60 * 60_000),
        tone: 'violet',
      },
    ];
  }, []);

  // آیا value انتخاب‌شده قبل از «الان» است؟
  const isPast = value !== null && value.getTime() <= Date.now();
  // آیا value قبل از minDate است؟
  const beforeMin =
    value !== null && minDate instanceof Date && value.getTime() < minDate.getTime();

  const display = value ? formatLongFa(value) : null;

  return (
    <div className={cn('w-full', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-auto min-h-[3rem] w-full justify-between rounded-xl px-3 py-2 text-start font-normal',
              'border-slate-300 dark:border-slate-600',
              !value && 'text-slate-400 dark:text-slate-500',
              value &&
                !isPast &&
                !beforeMin &&
                'border-violet-400 bg-violet-50/60 dark:border-violet-500 dark:bg-violet-950/20',
              (isPast || beforeMin) &&
                'border-rose-400 bg-rose-50/60 dark:border-rose-500 dark:bg-rose-950/20',
            )}
          >
            {display ? (
              <div className="flex flex-col gap-0.5 leading-tight">
                <span
                  dir="rtl"
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    isPast || beforeMin
                      ? 'text-rose-700 dark:text-rose-300'
                      : 'text-slate-900 dark:text-slate-100',
                  )}
                >
                  {display.dateLine}
                </span>
                <span
                  dir="ltr"
                  className={cn(
                    'text-xs tabular-nums tracking-wide',
                    isPast || beforeMin
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  ساعت {display.timeLine}
                </span>
              </div>
            ) : (
              <span className="text-sm">{placeholder}</span>
            )}
            <HiCalendar
              className={cn(
                'ms-2 h-5 w-5 shrink-0',
                isPast || beforeMin ? 'text-rose-500' : 'text-violet-500',
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-auto max-w-[min(420px,calc(100vw-2rem))] p-0"
        >
          {showPresets && (
            <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => onChange(p.date)}
                  className={cn(
                    'rounded-full border border-slate-200 px-3 py-1 text-xs font-medium transition',
                    'hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700',
                    'dark:border-slate-700 dark:text-slate-300 dark:hover:border-violet-500 dark:hover:bg-violet-950/30 dark:hover:text-violet-200',
                  )}
                >
                  {p.label}
                </button>
              ))}
              {value !== null && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={cn(
                    'ms-auto rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition',
                    'hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/30',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    <FiX className="h-3 w-3" />
                    پاک کردن
                  </span>
                </button>
              )}
            </div>
          )}
          <div dir="rtl" className="font-vazirmatn" style={{ direction: 'rtl' }}>
            <DatePicker
              value={dpValue}
              onChange={handleChange}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              format="YYYY/MM/DD HH:mm"
              plugins={[
                <TimePicker key="time" position="bottom" hStep={1} mStep={5} hideSeconds />,
              ]}
              minDate={minDate ?? undefined}
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <FiClock className="h-3.5 w-3.5" />
              ساعت با پلهٔ ۵ دقیقه
            </span>
            <span className="tabular-nums">
              {value
                ? `انتخاب‌شده: ${toPersianDigits(pad(value.getHours()))}:${toPersianDigits(pad(value.getMinutes()))}`
                : 'هنوز انتخاب نشده'}
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {(isPast || beforeMin) && (
        <p className="mt-2 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
          <FiX className="h-3.5 w-3.5" />
          {beforeMin
            ? 'تاریخ انتخاب‌شده قبل از حداقل مجاز است؛ پست فوری منتشر خواهد شد.'
            : 'تاریخ در گذشته است؛ پست فوری منتشر می‌شود (به جای زمان‌بندی).'}
        </p>
      )}
    </div>
  );
}
