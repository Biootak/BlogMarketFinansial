/**
 * /exchanges/[slug]/not-found — صفحهٔ ۴۰۴ سفارشی.
 */

import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import s from './not-found.module.css';

export default function ExchangeNotFound() {
  return (
    <section className={s.section} dir="rtl">
      <div className={s.inner}>
        <div className={s.code} aria-hidden>
          <span className={s.codeNum}>404</span>
        </div>
        <h1 className={s.title}>صرافی پیدا نشد</h1>
        <p className={s.sub}>
          صرافی که به دنبال آن می‌گردید وجود ندارد، منقضی شده یا هنوز فعال نشده است.
          می‌توانید به فهرست صرافی‌های فعال مراجعه کنید.
        </p>
        <div className={s.cta}>
          <Link href="/exchanges" className={s.ctaPrimary}>
            <Search size={14} strokeWidth={1.9} aria-hidden />
            <span>مشاهدهٔ فهرست صرافی‌ها</span>
          </Link>
          <Link href="/" className={s.ctaGhost}>
            <ArrowRight size={13} strokeWidth={1.9} className={s.ctaIcon} aria-hidden />
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </section>
  );
}
