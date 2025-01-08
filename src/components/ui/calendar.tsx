'use client';

import type * as React from 'react';
import DatePicker, { type DayValue, type DayRange, type Day } from '@hassanmojab/react-modern-calendar-datepicker';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';
import { cn } from '@/lib/utils';

interface BaseCalendarProps {
  className?: string;
  minDate?: Day;
  maxDate?: Day;
  disabledDates?: Day[];
  highlightedDates?: Day[];
}

interface SingleCalendarProps extends BaseCalendarProps {
  mode: 'single';
  selected: Day | null;
  onSelect?: (value: Day | null) => void;
}

interface RangeCalendarProps extends BaseCalendarProps {
  mode: 'range';
  selected: DayRange | null;
  onSelect?: (value: DayRange | null) => void;
}

type CalendarProps = SingleCalendarProps | RangeCalendarProps;

const Calendar: React.FC<CalendarProps> = ({
  className,
  mode,
  selected,
  onSelect,
  minDate,
  maxDate,
  disabledDates = [],
  highlightedDates = [],
  ...props
}) => {
  if (mode === 'single') {
    return (
      <div className={cn(
        'p-3 rounded-lg border bg-white',
        'border-border shadow-sm',
        'font-vazirmatn',
        className
      )}>
        <DatePicker
          value={selected}
          onChange={onSelect}
          shouldHighlightWeekends
          locale="fa"
          colorPrimary="rgb(var(--c-primary-600))"
          colorPrimaryLight="rgb(var(--c-primary-100))"
          minimumDate={minDate}
          maximumDate={maxDate}
          disabledDays={disabledDates}
          renderFooter={() => null}
          calendarClassName="!bg-white"
          {...props}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      'p-3 rounded-lg border bg-white',
      'border-border shadow-sm',
      className
    )}>
      <DatePicker
        value={selected || { from: null, to: null }}
        onChange={onSelect}
        shouldHighlightWeekends
        locale="fa"
        colorPrimary="rgb(var(--c-primary-600))"
        colorPrimaryLight="rgb(var(--c-primary-100))"
        minimumDate={minDate}
        maximumDate={maxDate}
        disabledDays={disabledDates}
        renderFooter={() => null}
        calendarClassName="!bg-white"
        {...props}
      />
    </div>
  );
};

Calendar.displayName = 'Calendar';

export { Calendar };
