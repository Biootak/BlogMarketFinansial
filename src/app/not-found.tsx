import { ArrowLeft, BookOpen, Compass, Home, MessageCircle, Search, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import s from './not-found.module.css';

export const metadata: Metadata = {
  title: 'صفحه یافت نشد | ۴۰۴',
  description: 'صفحه‌ای که دنبال آن می‌گردید وجود ندارد یا منتقل شده است.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className={s.section} dir="rtl">
      {/* Signature: دایرهٔ چرخان با غلظت gradient + Compass در مرکز */}
      <div className={s.codeMark} aria-hidden>
        <div className={s.codeRing} />
        <div className={s.codeRingInner} />
        <Compass className={s.codeIcon} strokeWidth={1.4} />
        <span className={s.codeNumber}>۴۰۴</span>
      </div>

      <div className={s.content}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          خطای مسیریابی
        </span>

        <h1 className={s.title}>این مسیر در نقشهٔ ما نیست</h1>

        <p className={s.sub}>
          صفحه‌ای که دنبال آن می‌گردید وجود ندارد، منتقل شده یا شاید هرگز ساخته نشده است. از جستجو یا
          لینک‌های زیر برای ادامه استفاده کنید.
        </p>

        <div className={s.cta}>
          <Link href="/" className={s.ctaPrimary}>
            <Home size={15} strokeWidth={1.8} aria-hidden />
            <span>صفحهٔ اصلی</span>
          </Link>
          <Link href="/archive" className={s.ctaSecondary}>
            <Search size={14} strokeWidth={1.8} aria-hidden />
            <span>جستجو در آرشیو</span>
          </Link>
          <Link href="/exchanges" className={s.ctaGhost}>
            <span>صرافی‌ها</span>
            <ArrowLeft size={13} strokeWidth={1.8} className={s.ctaIcon} aria-hidden />
          </Link>
        </div>

        <div className={s.helpful}>
          <span className={s.helpfulLabel}>شاید این لینک‌ها کمکتان کند:</span>
          <ul className={s.helpfulList}>
            <li>
              <Link href="/archive" className={s.helpfulLink}>
                <BookOpen size={13} strokeWidth={1.7} aria-hidden />
                <span>آرشیو مقالات</span>
              </Link>
            </li>
            <li>
              <Link href="/authors" className={s.helpfulLink}>
                <Users size={13} strokeWidth={1.7} aria-hidden />
                <span>نویسندگان</span>
              </Link>
            </li>
            <li>
              <Link href="/contact" className={s.helpfulLink}>
                <MessageCircle size={13} strokeWidth={1.7} aria-hidden />
                <span>تماس با ما</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
