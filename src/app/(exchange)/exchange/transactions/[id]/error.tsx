'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import s from './error.module.css';

export default function TransactionDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={s.root} dir="rtl" role="alert">
      <span className={s.iconBox} aria-hidden>
        <AlertTriangle size={18} strokeWidth={1.7} />
      </span>
      <div className={s.body}>
        <h2 className={s.title}>خطا در بارگذاری جزئیات تراکنش</h2>
        <p className={s.desc}>
          ارتباط با سرور برای دریافت جزئیات تراکنش با مشکل مواجه شد. لطفاً دوباره تلاش کنید یا به
          فهرست تراکنش‌ها برگردید.
        </p>
      </div>
      <button type="button" className={s.retry} onClick={() => reset()}>
        <RefreshCw size={12} aria-hidden />
        <span>تلاش دوباره</span>
      </button>
    </div>
  );
}
