/**
 * /exchanges/[slug]/not-found — وقتی صرافی با slug داده‌شده پیدا نشد
 *   یا status آن ACTIVE نیست (PENDING / SUSPENDED / BANNED).
 */

import { ArrowRight, Building2, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import s from './not-found.module.css';

export const metadata: Metadata = {
  title: 'صرافی یافت نشد',
  robots: { index: false },
};

export default function ExchangeNotFound() {
  return (
    <main className={s.root} dir="rtl">
      <div className={s.ambient} aria-hidden />
      <div className={s.card}>
        <div className={s.icon} aria-hidden>
          <Building2 size={28} strokeWidth={1.5} />
        </div>
        <h1 className={s.title}>صرافی پیدا نشد</h1>
        <p className={s.sub}>
          ممکن است صرافی مورد نظر هنوز تأیید نشده باشد، یا نام کوتاه (slug) نادرست وارد شده باشد.
        </p>
        <div className={s.actions}>
          <Link href="/exchanges" className={s.primary}>
            <Search size={14} aria-hidden />
            مشاهده همهٔ صرافی‌ها
          </Link>
          <Link href="/" className={s.ghost}>
            <ArrowRight size={14} aria-hidden />
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </main>
  );
}
