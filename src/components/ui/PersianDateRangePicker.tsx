'use client';

/**
 * PersianDateRangePicker
 * ============================================================================
 * انتخاب‌گر بازه تاریخ شمسی فارسی — popover-based.
 *
 *   - تقویم از `react-multi-date-picker` با calendar=persian، locale=persian_fa
 *   - picker در حالت inline داخل popover — بدون re-mount با هر onChange
 *   - onChange فقط وقتی هر دو from و to کامل شدند فراخوانی می‌شود
 *   - value: { from: Date | null; to: Date | null } | null
 * ============================================================================
 */

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import React from 'react';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { Calendar, DateObject } from 'react-multi-date-picker';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface PersianDateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatPersian(date: Date): string {
  const obj = new DateObject({ date, calendar: persian, locale: persian_fa });
  return obj.format('DD MMM YYYY');
}

export function PersianDateRangePicker({
  value,
  onChange,
  placeholder = 'انتخاب بازه زمانی',
  className,
  disabled = false,
}: PersianDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // تبدیل DateRange → DateObject[] برای Calendar
  const calendarValue = React.useMemo<DateObject[] | undefined>(() => {
    if (!value?.from) return undefined;
    const from = new DateObject({ date: value.from, calendar: persian, locale: persian_fa });
    if (!value.to) return [from];
    const to = new DateObject({ date: value.to, calendar: persian, locale: persian_fa });
    return [from, to];
  }, [value]);

  // فقط وقتی بازه کامل شد (هر دو from و to انتخاب شدند) به بالا اطلاع می‌دهیم
  const handleCalendarChange = (dates: DateObject[]) => {
    if (!dates || dates.length === 0) {
      onChange(null);
      return;
    }
    if (dates.length < 2 || !dates[1]) {
      // کاربر هنوز در حال انتخاب است — state را نگه می‌داریم بدون close/apply
      return;
    }
    const from = dates[0]?.toDate?.() ?? null;
    const to = dates[1]?.toDate?.() ?? null;
    onChange({ from, to });
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const hasValue = !!value?.from;
  const label = value?.from
    ? value.to
      ? `${formatPersian(value.from)}  —  ${formatPersian(value.to)}`
      : formatPersian(value.from)
    : null;

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-9 w-full justify-start gap-2 px-3 text-right font-normal',
              !hasValue && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm">{label ?? placeholder}</span>
            {hasValue && (
              <span
                role="button"
                aria-label="پاک کردن تاریخ"
                onClick={handleClear}
                className="ms-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" sideOffset={6}>
          <div dir="rtl" className="font-sans">
            <Calendar
              value={calendarValue}
              onChange={handleCalendarChange}
              range
              rangeHover
              calendar={persian}
              locale={persian_fa}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
