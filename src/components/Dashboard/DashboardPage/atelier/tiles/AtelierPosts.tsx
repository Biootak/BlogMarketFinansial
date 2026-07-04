'use client';

/**
 * AtelierPosts — ranked list of popular posts with view count.
 *
 * Editorial layout: rank, title, author + date, view count. Hairline
 * separators between rows. The #1 row gets a subtle gold accent
 * stripe on the left edge; the rest stay neutral. Hovering a row
 * reveals a small chevron/arrow indicator.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { HiOutlineArrowLeft, HiOutlineChartBar, HiOutlineEye } from 'react-icons/hi2';
import { fmt } from '../utils';

interface AtelierPostsProps {
  popularPosts: Array<{
    id: string;
    title: string;
    views: number;
    publishDate: string;
    author: string;
    slug: string;
  }>;
}

export default function AtelierPosts({ popularPosts }: AtelierPostsProps) {
  const top = useMemo(() => popularPosts.slice(0, 6), [popularPosts]);

  return (
    <section className="at-tile at-posts" aria-label="پست‌های پربازدید">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineChartBar className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">پربازدیدترین‌ها</h2>
            <p className="at-head__sub">{top.length.toLocaleString('fa-IR')} پست برتر</p>
          </div>
        </div>
        <Link href="/dashboard/posts" className="at-head__more">
          <span>همه</span>
          <HiOutlineArrowLeft className="w-3 h-3" aria-hidden />
        </Link>
      </header>

      {top.length === 0 ? (
        <p className="at-posts__empty">هنوز پست پربازدیدی منتشر نشده است.</p>
      ) : (
        <ol className="at-posts__list">
          {top.map((post, i) => (
            <li key={post.id} className={i === 0 ? 'is-first' : undefined}>
              <Link href={`/blog/${post.slug}`} className="at-postrow">
                <span className="at-postrow__rank">
                  <span className="at-postrow__rank-num">{(i + 1).toLocaleString('fa-IR')}</span>
                </span>
                <span className="at-postrow__body">
                  <span className="at-postrow__title" dir="rtl">
                    {post.title}
                  </span>
                  <span className="at-postrow__meta">
                    <span>{post.author}</span>
                    <span aria-hidden>·</span>
                    <span>{post.publishDate}</span>
                  </span>
                </span>
                <span className="at-postrow__views">
                  <HiOutlineEye className="w-3 h-3" aria-hidden />
                  <span className="tabular-nums">{fmt(post.views)}</span>
                </span>
                <HiOutlineArrowLeft className="at-postrow__arrow w-3.5 h-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
