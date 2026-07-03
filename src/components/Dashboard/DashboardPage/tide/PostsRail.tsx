'use client';

/**
 * PostsRail — TIDE 2026 (July 1) bottom posts rail.
 *
 * A horizontal scrolling row of "featured" cards (one per popular post)
 * with a sidebar of recent drafts. Designed to be the bottom-most
 * editorial section of the dashboard, NOT a data-heavy table.
 *
 * Visual differentiation from the ATLAS PostsSpotlight:
 *   - Horizontal scroll-snap row instead of vertical featured stack
 *   - Each card has a cover-area, eyebrow, title, byline, view count
 *   - The drafts rail is a single column on the right
 *
 * On mobile the row collapses to a single horizontal scroll and the
 * drafts list drops below it.
 */

import { Spotlight, type SpotlightTone } from '@/components/Dashboard/primitives';
import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineSparkles,
} from 'react-icons/hi2';

interface PostsRailProps {
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

const TONES = ['is-indigo', 'is-emerald', 'is-cyan', 'is-violet', 'is-amber', 'is-rose'] as const;
const SPOT_TONES: SpotlightTone[] = ['indigo', 'emerald', 'cyan', 'violet', 'amber', 'rose'];

function fmt(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function pickGradient(id: string): string {
  // Deterministic gradient per id so cards are stable across renders.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(135deg, oklch(70% 0.12 ${hue1}) 0%, oklch(64% 0.16 ${hue2}) 100%)`;
}

function coverPattern(seed: string): React.ReactNode {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const dots: React.ReactElement[] = [];
  for (let i = 0; i < 14; i++) {
    const x = (h * (i + 1)) % 100;
    const y = (h * (i + 7)) % 100;
    const r = ((h + i * 13) % 4) + 1;
    dots.push(
      <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r * 0.7} fill="currentColor" opacity={0.16} />,
    );
  }
  return <g aria-hidden>{dots}</g>;
}

export default function PostsRail({ popularPosts, recentDrafts }: PostsRailProps) {
  const trackId = useId();
  void trackId;

  // Clamp the rail scrolled state for the soft-edge fade.
  const [scrolled, setScrolled] = useState({ start: false, end: false });
  const [scroller, setScroller] = useState<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!scroller) return;
    const el = scroller;
    const onScroll = () => {
      const left = el.scrollLeft ?? 0;
      const maxScroll = (el.scrollWidth ?? 0) - (el.clientWidth ?? 0);
      setScrolled({ start: left > 4, end: maxScroll - left > 4 });
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scroller]);

  const top = useMemo(() => popularPosts.slice(0, 6), [popularPosts]);
  const drafts = useMemo(() => recentDrafts.slice(0, 6), [recentDrafts]);

  return (
    <section className="tide-posts" aria-label="پست‌های ویژه">
      <header className="tide-posts__head">
        <div className="tide-posts__head-meta">
          <span className="tide-posts__head-tag">۰۴ · محتوای ویژه</span>
          <h2 className="tide-posts__head-title">پست‌های پربازدید و پیش‌نویس‌ها</h2>
        </div>
        <Link href="/dashboard/posts" className="tide-posts__head-more">
          <span>مشاهده همه</span>
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </header>

      <div className="tide-posts__layout">
        <div
          className={cn(
            'tide-posts__scroller',
            scrolled.end && 'is-end',
            scrolled.start && 'is-start',
          )}
        >
          <ul ref={setScroller} className="tide-posts__track" aria-label="پست‌های پربازدید">
            {top.length === 0 ? (
              <li className="tide-posts__empty">
                <HiOutlineSparkles className="w-5 h-5" />
                <p>هنوز پست محبوبی منتشر نشده است.</p>
              </li>
            ) : (
              top.map((post, i) => (
                <motion.li
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.1 + i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={cn('tide-post', TONES[i % TONES.length])}
                >
                  <Spotlight tone={SPOT_TONES[i % SPOT_TONES.length]} size={240} />
                  <Link href={`/blog/${post.slug}`} className="tide-post__link">
                    <div className="tide-post__cover" style={{ background: pickGradient(post.id) }}>
                      <span className="tide-post__shine" aria-hidden />
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="tide-post__cover-pattern"
                        role="img"
                      >
                        <title>{post.title}</title>
                        {coverPattern(post.id)}
                      </svg>
                      <span className="tide-post__cover-eyebrow">
                        <HiOutlineEye className="w-3 h-3" />
                        <span className="tabular-nums">{fmt(post.views)}</span>
                      </span>
                    </div>
                    <div className="tide-post__body">
                      <h3 className="tide-post__title" dir="rtl">
                        {post.title}
                      </h3>
                      <p className="tide-post__meta">
                        <span>{post.author}</span>
                        <span aria-hidden>·</span>
                        <span>{post.publishDate}</span>
                      </p>
                    </div>
                  </Link>
                </motion.li>
              ))
            )}
          </ul>
        </div>

        <aside className="tide-posts__drafts" aria-label="پیش‌نویس‌های اخیر">
          <header className="tide-posts__drafts-head">
            <span className="tide-posts__head-ico" aria-hidden>
              <HiOutlineClock className="w-4 h-4" />
            </span>
            <span>پیش‌نویس‌های اخیر</span>
          </header>
          {drafts.length === 0 ? (
            <p className="tide-posts__drafts-empty">پیش‌نویسی برای نمایش وجود ندارد.</p>
          ) : (
            <ul className="tide-posts__drafts-list">
              {drafts.map((d) => (
                <li key={d.id} className="tide-posts__draft">
                  <Link href={`/dashboard/posts/edit/${d.id}`} className="tide-posts__draft-link">
                    <span className="tide-posts__draft-title">{d.title}</span>
                    <span className="tide-posts__draft-meta">
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
