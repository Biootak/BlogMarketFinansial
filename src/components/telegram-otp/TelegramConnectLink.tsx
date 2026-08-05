'use client';

/**
 * TelegramConnectLink — اتصال تلگرام برای دریافت OTP رایگان
 *
 * دکمه‌ی کوچک زیر فیلد OTP: اگر تلگرام وصل نباشد، لینک deep-link می‌گیرد و
 * در تب جدید باز می‌کند. بعد از اتصال، کدهای بعدی به تلگرام می‌روند.
 */

import { getTelegramLink } from '@/actions/telegram-otp';
import { useCallback, useState } from 'react';
import s from './TelegramConnectLink.module.css';

type LinkState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'linked' }
  | { kind: 'opened'; username: string }
  | { kind: 'error'; message: string };

export default function TelegramConnectLink() {
  const [state, setState] = useState<LinkState>({ kind: 'idle' });

  const handleClick = useCallback(async () => {
    if (state.kind === 'loading') return;
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
      setState({ kind: 'error', message: 'لینک اتصال در دسترس نیست.' });
      return;
    }
    window.open(res.data.url, '_blank', 'noopener');
    setState({ kind: 'opened', username: res.data.username });
  }, [state.kind]);

  if (state.kind === 'linked') {
    return <p className={s.ok}>✅ تلگرام شما متصل است — کدها به تلگرام ارسال می‌شوند.</p>;
  }

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.link}
        onClick={handleClick}
        disabled={state.kind === 'loading'}
      >
        {state.kind === 'loading'
          ? 'در حال ایجاد لینک…'
          : 'تلگرام وصل نشده؟ برای دریافت کد رایگان در تلگرام، اینجا را بزنید'}
      </button>
      {state.kind === 'opened' && (
        <p className={s.hint}>
          در تلگرام روی <b>Start</b> بزنید تا اتصال تأیید شود. سپس دوباره «دریافت کد» را بزنید.
        </p>
      )}
      {state.kind === 'error' && <p className={s.err}>{state.message}</p>}
    </div>
  );
}
