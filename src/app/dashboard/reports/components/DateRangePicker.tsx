'use client';

import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import { useState } from 'react';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: Array<{
    label: string;
    days: number;
  }>;
}

const DEFAULT_PRESETS = [
  { label: '7 روز گذشته', days: 7 },
  { label: '30 روز گذشته', days: 30 },
  { label: '90 روز گذشته', days: 90 },
  { label: '6 ماه گذشته', days: 180 },
  { label: '1 سال گذشته', days: 365 },
  { label: 'همه زمان‌ها', days: 365 * 2 }, // 2 سال (بهینه‌تر)
];

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    onChange({ from, to });
    setIsOpen(false);
  };

  const formatDateRange = (range: DateRange) => {
    const fromStr = range.from.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const toStr = range.to.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `${fromStr} - ${toStr}`;
  };

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2',
          'bg-white border border-gray-200 rounded-lg sm:rounded-xl',
          'hover:bg-gray-50 transition-colors',
          'text-xs sm:text-sm font-medium text-gray-700',
          'w-full sm:w-auto',
        )}
      >
        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
        <span className="truncate">{formatDateRange(value)}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute left-0 right-0 sm:right-auto mt-2 sm:w-56 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-1.5 sm:p-2">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 px-2 sm:px-3 py-1.5 sm:py-2">
                بازه زمانی
              </p>
              {presets.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handlePresetClick(preset.days)}
                  className={cn(
                    'w-full text-right px-2 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg',
                    'text-xs sm:text-sm text-gray-700 hover:bg-gray-100',
                    'transition-colors',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
