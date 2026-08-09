'use client';

/**
 * TrackStatusPoller — به‌روزرسانی زنده‌ی وضعیت معامله
 *
 * هر ۳۰ ثانیه وضعیت را از `/api/deal/track` می‌پرسد؛ اگر عوض شده بود
 * یک بنر «وضعیت تغییر کرد» با دکمه‌ی رفرش نشان می‌دهد.
 * - فقط برای وضعیت‌های غیرپایانی پل می‌کند (بعد از COMPLETED/CANCELLED/… متوقف می‌شود)
 * - وقتی تب مخفی است پل نمی‌کند (صرفه‌جویی در rate-limit و باتری)
 * - از fetch با AbortController استفاده می‌کند تا race-condition نشود
 */
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import s from './TrackStatusPoller.module.css';

const POLL_MS = 30_000;
const TERMINAL = new Set(['COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED']);

interface Props {
  code: string;
  initialStatus: string;
}

export default function TrackStatusPoller({ code, initialStatus }: Props) {
  const [changed, setChanged] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (TERMINAL.has(initialStatus)) return;

    const poll = async () => {
      if (!visibleRef.current || abortRef.current) return;
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch('/api/deal/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingCode: code }),
          signal: ac.signal,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          success: boolean;
          data?: { status?: string };
        };
        if (!json.success || !json.data?.status) return;
        if (json.data.status !== initialStatus) {
          setNewStatus(json.data.status);
          setChanged(true);
          // وضعیت پایانی رسید — دیگر پل نکن
          if (TERMINAL.has(json.data.status)) return;
        }
      } catch {
        // خطای موقت شبکه — بی‌صدا نادیده بگیر، پل بعدی خودش درست می‌کند
        setError(true);
        setTimeout(() => setError(false), 5000);
      } finally {
        abortRef.current = null;
      }
    };

    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibility);

    const id = setInterval(poll, POLL_MS);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      abortRef.current?.abort();
    };
  }, [code, initialStatus]);

  if (!changed) return null;

  return (
    <output className={s.banner} aria-live="polite">
      <span className={s.icon} aria-hidden>
        <AlertTriangle size={15} strokeWidth={2} />
      </span>
      <div className={s.body}>
        <span className={s.title}>وضعیت معامله تغییر کرد</span>
        <span className={s.sub}>
          {newStatus === 'COMPLETED'
            ? 'معامله‌ی شما تکمیل شد!'
            : newStatus
              ? 'برای دیدن جزئیات جدید صفحه را تازه کنید.'
              : 'برای دیدن جزئیات جدید صفحه را تازه کنید.'}
        </span>
      </div>
      <button type="button" className={s.btn} onClick={() => window.location.reload()}>
        <RefreshCw size={13} strokeWidth={2} aria-hidden />
        تازه‌سازی
      </button>
      {error && (
        <span className={s.errorTip} role="alert">
          ارتباط برقرار نشد؛ دوباره تلاش می‌کنم…
        </span>
      )}
    </output>
  );
}
