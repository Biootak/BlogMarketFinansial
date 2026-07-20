'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import React from 'react';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { HiCalendar } from 'react-icons/hi2';
import DatePicker, { DateObject } from 'react-multi-date-picker';

interface PersianDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
}

export function PersianDatePicker({ value, onChange, className }: PersianDatePickerProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const persianDate = new DateObject({ date, calendar: persian, locale: persian_fa });
    return persianDate.format('YYYY/MM/DD');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-right font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          {value ? formatDate(value) : <span>انتخاب تاریخ</span>}
          <HiCalendar className="mr-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DatePicker
          value={value}
          onChange={(date) => onChange(date?.toDate?.() || null)}
          calendar={persian}
          locale={persian_fa}
          calendarPosition="bottom-right"
        />
      </PopoverContent>
    </Popover>
  );
}
