'use client';

/**
 * /customer/not-found — صفحه ۴۰۴ پورتال مشتری
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { useStaggerReveal } from '@/hooks/useStaggerReveal';
import { ChevronLeft, Compass, Home, Search, UserSearch } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './not-found.module.css';

export default function CustomerNotFound() {
  const pathname = usePathname();
  const root = useStaggerReveal();

  return (
    <div ref={root} className={s.root} dir="rtl">
      <Spotlight tone="emerald" className={s.spotlight} />

      <div data-stagger className={s.codeCard}>
        <span className={s.codeNumber}>۴۰۴</span>
        <span className={s.codeIcon} aria-hidden>
          <UserSearch size={20} />
        </span>
      </div>

      <div data-stagger className={s.headBlock}>
        <h1 className={s.title}>این صفحه از پورتال شما پیدا نشد</h1>
        <p className={s.lead}>
          ممکن است به زبان دیگری منتقل شده باشد یا دسترسی لازم را نداشته باشید.
          <br />
          <code className={s.pathCode} dir="ltr">
            {pathname}
          </code>
        </p>
      </div>

      <div data-stagger className={s.actions}>
        <Link href="/customer/dashboard" className={s.primaryCta}>
          <Home size={14} aria-hidden />
          پورتال مشتری
          <ChevronLeft size={12} aria-hidden />
        </Link>
        <Link href="/customer/requests" className={s.ghostCta}>
          <Search size={14} aria-hidden />
          درخواست‌های من
        </Link>
        <Link href="/" className={s.ghostCta}>
          <Compass size={14} aria-hidden />
          صفحهٔ اصلی
        </Link>
      </div>
    </div>
  );
}
