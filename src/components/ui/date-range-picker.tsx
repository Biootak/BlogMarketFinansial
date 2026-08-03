'use client';

/**
 * @deprecated از `PersianDateRangePicker` (همین پوشه) استفاده کنید.
 * این component از کتابخانه میلادی استفاده می‌کرد و دیگر در پروژه کاربردی ندارد.
 * در اولین فرصت حذف شود.
 */

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DayRange } from '@hassanmojab/react-modern-calendar-datepicker';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerWithRangeProps {
  className?: string;
  date: DayRange | null;
  onDateChange: (date: DayRange | null) => void;
  minDate?: { year: number; month: number; day: number };
  maxDate?: { year: number; month: number; day: number };
  locale: string;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  minDate,
  maxDate,
  locale,
}: DatePickerWithRangeProps) {
  const formatDate = (day: { year: number; month: number; day: number }) => {
    const d = new Date(day.year, day.month - 1, day.day);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-right font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {formatDate(date.from)} - {formatDate(date.to)}
                </>
              ) : (
                formatDate(date.from)
              )
            ) : (
              <span>انتخاب بازه زمانی</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={date}
            onSelect={onDateChange}
            minDate={minDate}
            maxDate={maxDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
