/**
 * not-found.tsx — 404 اختصاصی برای صفحهٔ ویرایش پست.
 * وقتی پست حذف شده یا ID نامعتبر است، این صفحه نشان داده می‌شود
 * (به‌جای ارث‌بری از /dashboard/not-found که generic است).
 */

import { ArrowLeft, FileX2, ListChecks, Plus } from 'lucide-react';
import Link from 'next/link';
import s from './not-found.module.css';

export default function PostEditNotFound() {
  return (
    <section className={s.section} dir="rtl">
      <div className={s.codeMark} aria-hidden>
        <div className={s.codeRing} />
        <div className={s.codeRingInner} />
        <FileX2 className={s.codeIcon} strokeWidth={1.4} />
        <span className={s.codeNumber}>۴۰۴</span>
      </div>

      <div className={s.content}>
        <span className={s.eyebrow}>
          <span className={s.eyebrowDot} aria-hidden />
          پست یافت نشد
        </span>

        <h1 className={s.title}>این پست دیگر در دسترس نیست</h1>

        <p className={s.sub}>
          پستی که می‌خواستید ویرایش کنید حذف شده، منتقل شده یا هرگز ایجاد نشده است. می‌توانید به فهرست
          پست‌ها بازگردید یا پست جدیدی بسازید.
        </p>

        <div className={s.cta}>
          <Link href="/dashboard/posts/create" className={s.ctaPrimary}>
            <Plus size={15} strokeWidth={1.8} aria-hidden />
            <span>ساخت پست جدید</span>
          </Link>
          <Link href="/dashboard/posts" className={s.ctaSecondary}>
            <ListChecks size={14} strokeWidth={1.8} aria-hidden />
            <span>فهرست پست‌ها</span>
          </Link>
          <Link href="/dashboard" className={s.ctaGhost}>
            <span>داشبورد</span>
            <ArrowLeft size={13} strokeWidth={1.8} className={s.ctaIcon} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
