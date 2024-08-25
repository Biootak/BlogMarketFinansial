'use client';

import type * as React from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import { DayPicker, type DayPickerSingleProps } from 'react-day-picker';
import { format, isToday, parse } from 'date-fns-jalali';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = Omit<DayPickerSingleProps, 'mode'> & {
  mode?: 'single';
};

const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function getJalaliWeekday(weekday: number): string {
  // Convert Sunday-based index to Saturday-based index for Jalali calendar
  return weekDays[(weekday + 1) % 7];
}

function Calendar({
  className,
  classNames,
  selected,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected as Date | undefined}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 rtl:space-x-reverse',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        nav_button_previous: 'absolute right-1',
        nav_button_next: 'absolute left-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
          'hover:bg-muted hover:text-muted-foreground',
          'focus:bg-muted focus:text-muted-foreground',
        ),
        day_today: 'bg-blue-200 text-blue-800 font-bold ring ring-blue-500',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <HiChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <HiChevronRight className="h-4 w-4" />,
      }}
      dir="rtl"
      formatters={{
        formatWeekdayName: (weekday) => getJalaliWeekday(weekday.getDay()),
        formatCaption: (date) => format(date, 'MMMM yyyy'),
        formatDay: (date) => format(date, 'd'),
      }}
      fromDate={parse('1300/01/01', 'yyyy/MM/dd', new Date())}
      toDate={parse('1500/12/29', 'yyyy/MM/dd', new Date())}
      weekStartsOn={6}
      today={new Date()}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
