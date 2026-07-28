'use client';

/**
 * /(site)/not-found — صفحه ۴۰۴ عمومی سایت
 *
 * استایل site-level (نه dashboard). نرم‌تر، محتوا-محور.
 */

import { Compass, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import s from './not-found.module.css';

export default function SiteNotFound() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!root.current) return;
    const items = root.current.querySelectorAll<HTMLElement>('[data-stagger]');
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.5s var(--ds-ease, ease), transform 0.5s var(--ds-ease, ease)';
        el.style.transitionDelay = `${i * 60}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }, []);

  return (
    <div ref={root} className={s.root} dir="rtl">
      <div data-stagger className={s.codeCard}>
        <span className={s.codeNumber}>۴۰۴</span>
      </div>

      <div data-stagger className={s.headBlock}>
        <h1 className={s.title}>صفحه‌ای که دنبال آن می‌گردید پیدا نشد</h1>
        <p className={s.lead}>
          ممکن است لینک قدیمی باشد، صفحه منتقل شده باشد، یا آدرس را اشتباه وارد کرده باشید.
          <br />
          <code className={s.pathCode} dir="ltr">{pathname}</code>
        </p>
      </div>

      <div data-stagger className={s.actions}>
        <Link href="/" className={s.primaryCta}>
          <Home size={14} aria-hidden />
          صفحهٔ اصلی
        </Link>
        <Link href="/search" className={s.ghostCta}>
          <Search size={14} aria-hidden />
          جستجو
        </Link>
        <Link href="/contact" className={s.ghostCta}>
          <Compass size={14} aria-hidden />
          تماس با ما
        </Link>
      </div>
    </div>
  );
}
