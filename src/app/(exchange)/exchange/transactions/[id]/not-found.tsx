import Link from 'next/link';
import { ArrowRight, FileSearch } from 'lucide-react';
import s from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={s.root} dir="rtl" role="status">
      <span className={s.iconBox} aria-hidden>
        <FileSearch size={20} strokeWidth={1.6} />
      </span>
      <div className={s.body}>
        <h2 className={s.title}>تراکنش یافت نشد</h2>
        <p className={s.desc}>
          شناسه تراکنش نامعتبر است یا این تراکنش متعلق به صرافی شما نیست.
        </p>
      </div>
      <Link href="/exchange/transactions" className={s.back}>
        <ArrowRight size={12} aria-hidden />
        <span>بازگشت به فهرست</span>
      </Link>
    </div>
  );
}
