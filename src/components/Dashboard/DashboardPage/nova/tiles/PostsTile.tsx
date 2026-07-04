'use client';

/**
 * PostsTile — NOVA popular-content tile.
 *
 * A compact editorial tile: a ranked list of the most-viewed posts with a
 * gradient rank badge and view count, plus a slim drafts column. Denser and
 * flatter than the TIDE horizontal PostsRail so it sits inside one bento cell.
 */

import { Spotlight } from '@/components/Dashboard/primitives';
import Link from 'next/link';
import { useMemo } from 'react';
import { HiOutlineArrowLeft, HiOutlineEye, HiOutlineFire, HiOutlinePencil } from 'react-icons/hi2';
import { fmt } from '../utils';

interface PostsTileProps {
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

export default function PostsTile({ popularPosts, recentDrafts }: PostsTileProps) {
  const top = useMemo(() => popularPosts.slice(0, 5), [popularPosts]);
  const drafts = useMemo(() => recentDrafts.slice(0, 4), [recentDrafts]);

  return (
    <section className="nova-tile nova-tile--posts" data-tone="primary" aria-label="پست‌های ویژه">
      <Spotlight tone="indigo" size={340} />
      <div className="nova-posts__grid">
        <div className="nova-posts__main">
          <header className="nova-panel__head nova-panel__head--tight">
            <div className="nova-panel__head-title">
              <span className="nova-panel__head-ico" aria-hidden>
                <HiOutlineFire className="w-4 h-4" />
              </span>
              <h2 className="nova-panel__title">پربازدیدترین‌ها</h2>
            </div>
            <Link href="/dashboard/posts" className="nova-morelink">
              <span>همه</span>
              <HiOutlineArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </header>

          {top.length === 0 ? (
            <p className="nova-posts__empty">هنوز پست پربازدیدی منتشر نشده است.</p>
          ) : (
            <ol className="nova-posts__list">
              {top.map((post, i) => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="nova-postrow">
                    <span className="nova-postrow__rank">
                      {(i + 1).toLocaleString('fa-IR')}
                    </span>
                    <span className="nova-postrow__body">
                      <span className="nova-postrow__title" dir="rtl">
                        {post.title}
                      </span>
                      <span className="nova-postrow__meta">
                        <span>{post.author}</span>
                        <span aria-hidden>·</span>
                        <span>{post.publishDate}</span>
                      </span>
                    </span>
                    <span className="nova-postrow__views">
                      <HiOutlineEye className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{fmt(post.views)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="nova-posts__drafts" aria-label="پیش‌نویس‌های اخیر">
          <header className="nova-posts__drafts-head">
            <HiOutlinePencil className="w-3.5 h-3.5" aria-hidden />
            <span>پیش‌نویس‌های اخیر</span>
          </header>
          {drafts.length === 0 ? (
            <p className="nova-posts__empty">پیش‌نویسی وجود ندارد.</p>
          ) : (
            <ul className="nova-posts__drafts-list">
              {drafts.map((d) => (
                <li key={d.id}>
                  <Link href={`/dashboard/posts/edit/${d.id}`} className="nova-draft">
                    <span className="nova-draft__title">{d.title}</span>
                    <span className="nova-draft__meta">
                      {d.author} · {d.date}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
