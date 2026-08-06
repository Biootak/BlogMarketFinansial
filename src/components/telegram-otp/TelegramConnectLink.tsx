'use client';

import { getTelegramLink } from '@/actions/telegram-otp';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './TelegramConnectLink.module.css';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'linked' }
  | { kind: 'waiting' } // باز شده — منتظر Start زدن کاربر در تلگرام
  | { kind: 'error'; message: string };

const POLL_INTERVAL_MS = 3000; // هر ۳ ثانیه چک می‌کند
const POLL_MAX_ATTEMPTS = 20; // حداکثر ۱ دقیقه

export default function TelegramConnectLink() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  // وقتی کاربر Start زد در تلگرام، ربات webhook را صدا می‌زند و telegramChatId ست می‌شود.
  // Polling هر ۳ ثانیه getTelegramLink را صدا می‌زند — اگر linked برگشت → خودکار تأیید می‌شود.
  const startPolling = useCallback(() => {
    attemptsRef.current = 0;
    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;
      if (attemptsRef.current > POLL_MAX_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      const res = await getTelegramLink();
      if (res.success && res.data.linked) {
        if (pollRef.current) clearInterval(pollRef.current);
        setState({ kind: 'linked' });
      }
    }, POLL_INTERVAL_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (state.kind === 'loading' || state.kind === 'waiting') return;
    setState({ kind: 'loading' });

    const res = await getTelegramLink();
    if (!res.success) {
      setState({ kind: 'error', message: res.error.message });
      return;
    }
    if (res.data.linked) {
      setState({ kind: 'linked' });
      return;
    }
    if (!res.data.url) {
      setState({ kind: 'error', message: 'سرویس تلگرام هنوز فعال نشده.' });
      return;
    }

    // باز کردن تلگرام + شروع polling
    window.open(res.data.url, '_blank', 'noopener,noreferrer');
    setState({ kind: 'waiting' });
    startPolling();
  }, [state.kind, startPolling]);

  if (state.kind === 'linked') {
    return <output className={s.ok}>✅ تلگرام متصل است — کدها مستقیم به تلگرام می‌رسند.</output>;
  }

  if (state.kind === 'waiting') {
    return (
      <output className={s.waiting} aria-live="polite">
        <span className={s.pulse} aria-hidden>
          ⏳
        </span>
        <span>
          تلگرام باز شد — روی <b>Start</b> بزنید. اتصال خودکار تأیید می‌شود…
        </span>
      </output>
    );
  }

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.btn}
        onClick={handleClick}
        disabled={state.kind === 'loading'}
        aria-busy={state.kind === 'loading'}
      >
        <span className={s.tgIcon} aria-hidden>
          ✈️
        </span>
        {state.kind === 'loading' ? 'در حال ایجاد لینک…' : 'دریافت کد از تلگرام (رایگان)'}
      </button>
      {state.kind === 'error' && (
        <p className={s.err} role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
