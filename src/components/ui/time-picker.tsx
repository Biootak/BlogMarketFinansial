'use client';

import { Clock } from 'lucide-react';
import * as React from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import styles from './time-picker.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface TimePickerProps {
  /** زمان به فرمت "HH:MM" (۲۴ ساعته) */
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * TimePicker — جایگزین `<input type="time">` (قانون P0 native-never).
 *
 * الگو: popover با دو ستون ساعت/دقیقه (USWDS/PatternFly — انتخاب از لیست
 * گزینه‌ها به‌جای typing آزاد). پاپ‌آور باز می‌ماند تا ساعت و دقیقه پشت
 * سر هم ست شوند؛ بستن با کلیک بیرون / Esc (Radix Popover).
 */
export function TimePicker({
  value,
  onChange,
  disabled,
  id,
  'aria-label': ariaLabel,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hour, minute] = value.split(':');
  const hourRef = React.useRef<HTMLLIElement | null>(null);
  const minuteRef = React.useRef<HTMLLIElement | null>(null);

  // اسکرول خودکار به مقدار انتخاب‌شده وقتی پاپ‌آور باز می‌شود
  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      hourRef.current?.scrollIntoView({ block: 'center' });
      minuteRef.current?.scrollIntoView({ block: 'center' });
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // مقدار خالی با '--:--' نمایش داده می‌شود؛ وقتی هنوز ساعتی ست نشده،
  // طرف مقابل باید به '00' سقوط کند تا onChange همیشه 'HH:MM' معتبر بدهد.
  const selectHour = (h: string) => onChange(`${h}:${minute === '--' ? '00' : minute}`);
  const selectMinute = (m: string) => onChange(`${hour === '--' ? '00' : hour}:${m}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          dir="ltr"
          className={cn(styles.trigger, className)}
        >
          <Clock size={13} aria-hidden className={styles.icon} />
          <span>{value || '--:--'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={styles.content}>
        <div className={styles.columns}>
          <div className={styles.col}>
            <div className={styles.colLabel}>ساعت</div>
            <ScrollArea className={styles.scroll}>
              <ul className={styles.list}>
                {HOURS.map((h) => (
                  <li
                    key={h}
                    ref={h === hour ? hourRef : undefined}
                    className={cn(styles.optionWrap, h === hour && styles.optionWrapActive)}
                  >
                    <button
                      type="button"
                      dir="ltr"
                      className={styles.option}
                      aria-pressed={h === hour}
                      onClick={() => selectHour(h)}
                    >
                      {h}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
          <div className={styles.col}>
            <div className={styles.colLabel}>دقیقه</div>
            <ScrollArea className={styles.scroll}>
              <ul className={styles.list}>
                {MINUTES.map((m) => (
                  <li
                    key={m}
                    ref={m === minute ? minuteRef : undefined}
                    className={cn(styles.optionWrap, m === minute && styles.optionWrapActive)}
                  >
                    <button
                      type="button"
                      dir="ltr"
                      className={styles.option}
                      aria-pressed={m === minute}
                      onClick={() => selectMinute(m)}
                    >
                      {m}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
