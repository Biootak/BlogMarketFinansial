'use client';

/**
 * LiveClock — ساعت زنده با پشتیبانی از timezone دلخواه (CSS-driven, no framer-motion)
 *
 * - به‌روزرسانی هر ثانیه با setInterval
 * - استفاده از Intl.DateTimeFormat با timezone قابل تنظیم
 * - PersianDigits
 * - Pulse dot و blink colon از CSS keyframe (anim-blink, anim-liveclock-pulse)
 * - prefers-reduced-motion توسط global rule در globals.css → animation حذف میشه
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn, toPersianNumber } from '@/lib/utils';

interface LiveClockProps {
  className?: string;
  showSeconds?: boolean;
  showIcon?: boolean;
  /** منطقه‌ی زمانی (IANA). پیش‌فرض: Asia/Tehran */
  timeZone?: string;
}

function getTimeParts(
  showSeconds: boolean,
  timeZone: string,
): { hour: string; minute: string; second: string | undefined } {
  const formatter = new Intl.DateTimeFormat('fa-IR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '۰۰';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '۰۰';
  const second = parts.find((p) => p.type === 'second')?.value;
  return { hour, minute, second };
}

export default function LiveClock({
  className,
  showSeconds = true,
  showIcon = true,
  timeZone = 'Asia/Tehran',
}: LiveClockProps) {
  // server snapshot: خالی. client بعد از mount populate می‌کنه.
  // این کار از hydration mismatch (به‌دلیل تفاوت ثانیه‌ی سرور و کلاینت) جلوگیری می‌کنه.
  const [time, setTime] = useState<{ hour: string; minute: string; second: string | undefined }>({
    hour: '۰۰',
    minute: '۰۰',
    second: undefined,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => setTime(getTimeParts(showSeconds, timeZone));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [showSeconds, timeZone]);

  // تا قبل از mount، فقط hour:minute بدون ثانیه نمایش بده
  // تا HTML سرور و کلاینت یکسان باشن
  const renderSecond = mounted && showSeconds && time.second;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        'text-[11px] sm:text-xs',
        'text-neutral-600 dark:text-neutral-400',
        'font-vazirmatn',
        'tabular-nums',
        className,
      )}
      // dir="ltr" + unicode-bidi: isolate تضمین می‌کنه ترتیب ارقام
      // در containerهای RTL (مثل کل صفحه) حفظ بشه: HH:MM نه MM:HH
      dir="ltr"
      style={{ unicodeBidi: 'isolate' }}
      suppressHydrationWarning
    >
      {showIcon && (
        <Clock className="h-3 w-3 text-neutral-400" strokeWidth={2} aria-hidden />
      )}
      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
        {time.hour}
      </span>
      <span className="text-neutral-400 anim-blink" aria-hidden>:</span>
      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
        {time.minute}
      </span>
      {showSeconds && renderSecond ? (
        <>
          <span className="text-neutral-400 anim-blink" aria-hidden>:</span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {toPersianNumber(time.second!)}
          </span>
        </>
      ) : null}
      <span
        className="ms-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 anim-liveclock-pulse"
        aria-hidden
      />
    </div>
  );
}
