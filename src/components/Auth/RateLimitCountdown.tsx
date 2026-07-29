'use client';

/**
 * RateLimitCountdown — visual countdown for rate-limit notices
 *
 * 2026-07-29: وقتی سرور به دلیل rate-limit درخواست را رد می‌کند و
 * `cooldownMs` برمی‌گرداند، این کامپوننت یک شمارندهٔ زنده فارسی نمایش
 * می‌دهد تا کاربر بداند چقدر باید صبر کند.
 *
 * - خودکار شمارش معکوس هر ثانیه
 * - فرمت فارسی (`۲:۳۴` یا `۴۵ ثانیه`)
 * - وقتی به صفر برسد، خودکار unmount می‌شود
 * - رنگ هشدار هنگام نزدیک شدن به صفر
 */

import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './RateLimitCountdown.module.css';

export interface RateLimitCountdownProps {
  /** زمان باقی‌مانده به میلی‌ثانیه */
  initialMs: number;
  /** Callback وقتی شمارنده به صفر برسد */
  onExpire?: () => void;
  /** کلاس اضافی برای container */
  className?: string;
}

const formatFa = (n: number): string =>
  n.toLocaleString('fa-IR', { useGrouping: false });

/**
 * تبدیل میلی‌ثانیه به رشتهٔ فارسی:
 *  >= 60s  → "M:SS" (مثل "۲:۳۴")
 *  <  60s  → "N ثانیه"
 */
function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  if (totalSec >= 60) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${formatFa(m)}:${formatFa(s).padStart(2, '۰')}`;
  }
  return `${formatFa(totalSec)} ثانیه`;
}

export function RateLimitCountdown({
  initialMs,
  onExpire,
  className,
}: RateLimitCountdownProps) {
  const [ms, setMs] = useState(Math.max(0, initialMs));

  useEffect(() => {
    setMs(Math.max(0, initialMs));
  }, [initialMs]);

  useEffect(() => {
    if (ms <= 0) {
      onExpire?.();
      return;
    }
    const t = window.setInterval(() => {
      setMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(t);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ms, onExpire]);

  if (ms <= 0) return null;

  // وقتی کمتر از ۱۰ ثانیه مانده، urgent class برای تاکید بصری
  const isUrgent = ms < 10_000;
  const isWarning = ms < 30_000 && !isUrgent;

  return (
    <div
      className={[
        styles.root,
        isWarning ? styles.warning : null,
        isUrgent ? styles.urgent : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      dir="rtl"
    >
      <span className={styles.icon} aria-hidden>
        <Clock size={14} />
      </span>
      <span className={styles.text}>
        می‌توانید دوباره تلاش کنید در{' '}
        <strong className={styles.value}>{formatDuration(ms)}</strong>
      </span>
      <span className={styles.bar} aria-hidden>
        <span
          className={styles.barFill}
          style={{
            // فقط برای ۱۵ دقیقه (بیشینه rate-limit) درصد نمایش می‌دهیم
            width: `${Math.min(100, (ms / (15 * 60 * 1000)) * 100)}%`,
          }}
        />
      </span>
    </div>
  );
}
