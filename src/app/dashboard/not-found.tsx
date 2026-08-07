'use client';

/**
 * /dashboard/not-found — صفحه ۴۰۴ اختصاصی داشبورد
 *
 * فقط برای زیرمسیرهایی که `notFound()` صدا می‌زنند.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { useStaggerReveal } from '@/hooks/useStaggerReveal';
import { ChevronLeft, Compass, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './not-found.module.css';

export default function DashboardNotFound() {
  const pathname = usePathname();
  const root = useStaggerReveal();

  return (
    <div ref={root} className={s.root} dir="rtl">
      <Spotlight tone="violet" className={s.spotlight} />

      <div data-stagger className={s.codeCard}>
        <span className={s.codeNumber}>۴۰۴</span>
        <span className={s.codeTrail} aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      </div>

      <div data-stagger className={s.headBlock}>
        <h1 className={s.title}>این صفحه پیدا نشد</h1>
        <p className={s.lead}>
          شاید منتقل شده، حذف شده، یا اصلاً وجود نداشته.
          <br />
          <code className={s.pathCode} dir="ltr">
            {pathname}
          </code>
        </p>
      </div>

      <div data-stagger className={s.actions}>
        <Link href="/dashboard" className={s.primaryCta}>
          <Home size={14} aria-hidden />
          بازگشت به داشبورد
          <ChevronLeft size={12} aria-hidden />
        </Link>
        <Link href="/search" className={s.ghostCta}>
          <Search size={14} aria-hidden />
          جستجو در سایت
        </Link>
        <Link href="/" className={s.ghostCta}>
          <Compass size={14} aria-hidden />
          صفحهٔ اصلی
        </Link>
      </div>
    </div>
  );
}
