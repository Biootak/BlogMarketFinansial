'use client';

/**
 * TrackSearchBox — جستجوی مجدد کد پیگیری در صفحه‌ی «معامله یافت نشد».
 *
 * کد را normalize (uppercase) می‌کند و به /track/{code} می‌رود.
 * اگر خالی باشد، فقط hint نمایش می‌دهد — بدون ریدایرکت بی‌هدف.
 */
import { ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import s from './TrackSearchBox.module.css';

interface Props {
  initial?: string;
}

export default function TrackSearchBox({ initial = '' }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (!code) return;
    router.push(`/track/${encodeURIComponent(code)}`);
  };

  return (
    <form className={s.form} onSubmit={submit} aria-label="جستجوی کد پیگیری">
      <div className={s.box}>
        <Search size={15} className={s.icon} aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="مثلاً DL-2026-1007"
          dir="ltr"
          className={s.input}
          aria-label="کد پیگیری"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={s.btn} disabled={!value.trim()}>
          بررسی مجدد
          <ArrowLeft size={14} aria-hidden />
        </button>
      </div>
    </form>
  );
}
