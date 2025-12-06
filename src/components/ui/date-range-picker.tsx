'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { format } from 'date-fns-jalali';
import type { DateRange } from 'react-day-picker';

interface DatePickerWithRangeProps {
  className?: string;
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  minDate,
  maxDate,
}: DatePickerWithRangeProps) {
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
                  {format(date.from, 'yyyy/MM/dd')} - {format(date.to, 'yyyy/MM/dd')}
                </>
              ) : (
                format(date.from, 'yyyy/MM/dd')
              )
            ) : (
              <span>انتخاب بازه زمانی</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
