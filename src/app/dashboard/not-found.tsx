'use client';

/**
 * /dashboard/not-found — صفحه ۴۰۴ اختصاصی داشبورد
 *
 * فقط برای زیرمسیرهایی که `notFound()` صدا می‌زنند.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { ChevronLeft, Compass, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import s from './not-found.module.css';

export default function DashboardNotFound() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // micro-entrance — staggered reveal
    if (!root.current) return;
    const items = root.current.querySelectorAll<HTMLElement>('[data-stagger]');
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.5s var(--nova-ease), transform 0.5s var(--nova-ease)';
        el.style.transitionDelay = `${i * 60}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }, []);

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
