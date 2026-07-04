'use client';

/**
 * EditorialPosts — ranked list of popular posts with view count.
 *
 * Editorial layout: rank, title, author + date, view count. Hairline
 * separators between rows. Dense and readable.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { HiOutlineArrowLeft, HiOutlineChartBar, HiOutlineEye } from 'react-icons/hi2';
import { fmt } from '../utils';

interface EditorialPostsProps {
  popularPosts: Array<{
    id: string;
    title: string;
    views: number;
    publishDate: string;
    author: string;
    slug: string;
  }>;
  recentDrafts: Array<{ id: string; title: string; date: string; author: string }>;
}

export default function EditorialPosts({ popularPosts, recentDrafts }: EditorialPostsProps) {
  const top = useMemo(() => popularPosts.slice(0, 6), [popularPosts]);
  const drafts = useMemo(() => recentDrafts.slice(0, 3), [recentDrafts]);

  return (
    <section className="ec-tile ec-posts" aria-label="پست‌های پربازدید">
      <header className="ec-head">
        <div className="ec-head__title">
          <span className="ec-head__ico" aria-hidden>
            <HiOutlineChartBar className="w-3.5 h-3.5" />
          </span>
          <div className="ec-head__text">
            <h2 className="ec-head__title-text">پربازدیدترین‌ها</h2>
            <p className="ec-head__sub">{drafts.length.toLocaleString('fa-IR')} پیش‌نویس اخیر</p>
          </div>
        </div>
        <Link href="/dashboard/posts" className="ec-head__more">
          <span>همه</span>
          <HiOutlineArrowLeft className="w-3 h-3" aria-hidden />
        </Link>
      </header>

      {top.length === 0 ? (
        <p className="ec-posts__empty">هنوز پست پربازدیدی منتشر نشده است.</p>
      ) : (
        <ol className="ec-posts__list">
          {top.map((post, i) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`} className="ec-postrow">
                <span className="ec-postrow__rank">{(i + 1).toLocaleString('fa-IR')}</span>
                <span className="ec-postrow__body">
                  <span className="ec-postrow__title" dir="rtl">
                    {post.title}
                  </span>
                  <span className="ec-postrow__meta">
                    <span>{post.author}</span>
                    <span aria-hidden> · </span>
                    <span>{post.publishDate}</span>
                  </span>
                </span>
                <span className="ec-postrow__views">
                  <HiOutlineEye className="w-3 h-3" aria-hidden />
                  <span className="tabular-nums">{fmt(post.views)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
