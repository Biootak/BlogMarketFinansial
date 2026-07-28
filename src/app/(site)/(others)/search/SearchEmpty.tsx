'use client';

import { ArrowRight, FileSearch, Search as SearchIcon, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import s from './search-results.module.css';

type SearchEmptyProps = {
  query: string;
  hasResults?: boolean;
};

const POPULAR_SEARCHES = [
  'بیت‌کوین',
  'قیمت طلا',
  'بورس',
  'صرافی ارز دیجیتال',
  'نرخ دلار',
  'سرمایه‌گذاری',
  'ارز',
  'تحلیل بازار',
] as const;

export function SearchEmpty({ query, hasResults = true }: SearchEmptyProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(query);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = new URLSearchParams(sp.toString());
    next.set('q', trimmed);
    router.push(`/search?${next.toString()}`);
  };

  const title = !query
    ? 'چه چیزی دنبال می‌کنید؟'
    : !hasResults
      ? 'نتیجه‌ای یافت نشد'
      : 'جستجوی خود را شروع کنید';

  const sub = !query
    ? 'مقالات، تحلیل‌ها، نرخ‌ها و راهنماهای مالی را در یک‌جا جستجو کنید.'
    : !hasResults
      ? `موردی برای «${query}» پیدا نکردیم. پیشنهاد می‌کنیم با کلمات کلیدی دیگری جستجو کنید.`
      : 'برای شروع، کلمه کلیدی خود را وارد کنید.';

  return (
    <div className={s.page}>
      <div className="container">
        <div className={s.hero}>
          <div className={s.eyebrow}>
            <SearchIcon size={13} strokeWidth={1.75} aria-hidden />
            جستجو
          </div>
          <h1 className={s.title}>
            <span className={s.titleAccent}>{title}</span>
          </h1>
          <p className={s.sub}>{sub}</p>

          <form onSubmit={onSubmit} className={s.searchForm} role="search" aria-label="جستجو">
            <span className={s.searchIcon} aria-hidden>
              <SearchIcon size={18} strokeWidth={1.75} />
            </span>
            <input
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در مقالات، نویسندگان، دسته‌بندی‌ها…"
              className={s.searchInput}
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className={s.searchButton} aria-label="ارسال جستجو">
              <span>جستجو</span>
              <ArrowLeft size={14} strokeWidth={2} aria-hidden />
            </button>
          </form>

          <div className={s.suggestions}>
            <span className={s.suggestionLabel}>
              <TrendingUp size={11} strokeWidth={2} style={{ verticalAlign: 'middle' }} aria-hidden /> جستجوی پرطرفدار:
            </span>
            {POPULAR_SEARCHES.map((term) => (
              <Link key={term} href={`/search?q=${encodeURIComponent(term)}`} className={s.suggestionChip}>
                {term}
              </Link>
            ))}
          </div>
        </div>

        {!hasResults ? (
          <div className={s.empty}>
            <div className={s.emptyIcon} aria-hidden>
              <FileSearch size={28} strokeWidth={1.5} />
            </div>
            <h2 className={s.emptyTitle}>هیچ نتیجه‌ای پیدا نشد</h2>
            <p className={s.emptyText}>
              ممکن است کلمه کلیدی شما اشتباه باشد یا محتوای مرتبطی با این عنوان وجود نداشته باشد. پیشنهاد
              می‌کنیم:
            </p>
            <div className={s.emptyCtas}>
              <Link href="/" className={`${s.emptyCta} ${s.emptyCtaPrimary}`}>
                بازگشت به خانه
              </Link>
              <Link href="/archive" className={s.emptyCta}>
                مشاهده آرشیو مقالات
              </Link>
              <Link href="/contact" className={s.emptyCta}>
                پیشنهاد موضوع
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
