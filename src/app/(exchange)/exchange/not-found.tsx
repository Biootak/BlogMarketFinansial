'use client';

/**
 * /exchange/not-found — صفحه ۴۰۴ پنل صرافی
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import { Building2, ChevronLeft, Compass, Home, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import s from './not-found.module.css';

export default function ExchangeNotFound() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
      <Spotlight tone="amber" className={s.spotlight} />

      <div data-stagger className={s.codeCard}>
        <span className={s.codeNumber}>۴۰۴</span>
        <span className={s.codeIcon} aria-hidden>
          <SearchX size={20} />
        </span>
      </div>

      <div data-stagger className={s.headBlock}>
        <h1 className={s.title}>این صفحه از پنل صرافی پیدا نشد</h1>
        <p className={s.lead}>
          ممکن است تراکنش/مشتری حذف شده یا شناسهٔ آن تغییر کرده باشد.
          <br />
          <code className={s.pathCode} dir="ltr">{pathname}</code>
        </p>
      </div>

      <div data-stagger className={s.actions}>
        <Link href="/exchange/dashboard" className={s.primaryCta}>
          <Building2 size={14} aria-hidden />
          پنل صرافی
          <ChevronLeft size={12} aria-hidden />
        </Link>
        <Link href="/exchange/transactions" className={s.ghostCta}>
          <Search size={14} aria-hidden />
          تراکنش‌ها
        </Link>
        <Link href="/exchange/customers" className={s.ghostCta}>
          <Home size={14} aria-hidden />
          مشتریان
        </Link>
        <Link href="/" className={s.ghostCta}>
          <Compass size={14} aria-hidden />
          صفحهٔ اصلی
        </Link>
      </div>
    </div>
  );
}
