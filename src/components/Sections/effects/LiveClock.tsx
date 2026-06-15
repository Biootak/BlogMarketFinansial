'use client';

/**
 * LiveClock — ساعت تهران با pulse dot
 *
 * تکنیک:
 *  - به‌روزرسانی هر ثانیه (interval با cleanup درست)
 *  - استفاده از Intl.DateTimeFormat با timezone Asia/Tehran
 *  - PersianDigits
 *  - Pulse dot کنار ساعت
 *  - Subtle separator animation (colon چشمک می‌زنه)
 *  - respect prefers-reduced-motion (غیرفعال کردن pulse)
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { cn, toPersianNumber } from '@/lib/utils';
import { STRIPE_EASE } from '@/lib/motion';

interface LiveClockProps {
  className?: string;
  showSeconds?: boolean;
  showIcon?: boolean;
}

function getTehranTimeParts(showSeconds: boolean) {
  const formatter = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
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
}: LiveClockProps) {
  const [time, setTime] = useState(() => getTehranTimeParts(showSeconds));
  const reduce = useReducedMotion();

  useEffect(() => {
    const update = () => setTime(getTehranTimeParts(showSeconds));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [showSeconds]);

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
      <motion.span
        className="text-neutral-400"
        animate={reduce ? undefined : { opacity: [1, 0.2, 1] }}
        transition={
          reduce
            ? undefined
            : { duration: 1.2, repeat: Infinity, ease: STRIPE_EASE, times: [0, 0.5, 1] }
        }
        aria-hidden
      >
        :
      </motion.span>
      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
        {time.minute}
      </span>
      {showSeconds && time.second && (
        <>
          <motion.span
            className="text-neutral-400"
            animate={reduce ? undefined : { opacity: [1, 0.2, 1] }}
            transition={
              reduce
                ? undefined
                : { duration: 1.2, repeat: Infinity, ease: STRIPE_EASE, times: [0, 0.5, 1] }
            }
            aria-hidden
          >
            :
          </motion.span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {toPersianNumber(time.second)}
          </span>
        </>
      )}
      <span
        className="ms-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"
        style={
          reduce
            ? undefined
            : {
                animation: 'liveclock-pulse 2s ease-in-out infinite',
              }
        }
        aria-hidden
      />
      <style jsx>{`
        @keyframes liveclock-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); opacity: 1; }
          50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
