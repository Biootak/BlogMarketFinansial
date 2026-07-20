'use client';

/**
 * AtelierPosts — ranked list of popular posts with featured treatment.
 *
 * 2026-07-04 (evening) — Editorial redesign.
 *
 * Visual identity:
 *   • سرصفحه با فیلتر سه‌حالته (همه/پربازدید/پیش‌نویس) که به‌صورت
 *     pill در سمت راست نشسته؛ انتخاب در `localStorage[at:posts-filter]`
 *     ذخیره می‌شود تا بین session ها بمونه.
 *   • یک Featured card برای پست شمارهٔ ۱: rank badge طلایی بزرگ،
 *     عنوان خیلی بزرگ، excerpt ۲-خطی، author + date + view count
 *     کنار هم، یه CTA «خواندن» در پایین. hairline طلایی سمت چپ
 *     (RTL-safe با `inset-inline-start`) به عنوان «تاج».
 *   • Ranked list برای پست‌های ۲..۶: فشرده، hover lift، شماره
 *     رتبه + عنوان + author/views کنار هم.
 *   • اگه پستی نبود: dashed empty با CTA به `/dashboard/posts/create`.
 *
 * دلیل مکان (ردیف ۶، عرض ۸/۱۲):
 *   Featured پست «آن‌چه الان live هست» را نشان می‌دهد؛ این یک
 *   real-time view است و باید هم‌ردهٔ Activity feed قرار بگیرد.
 *   عرض بیشتر نسبت به Activity به خاطر Featured card بزرگ است.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineArrowTrendingUp,
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { fmt } from '../utils';

interface PopularPost {
  id: string;
  title: string;
  views: number;
  publishDate: string;
  author: string;
  slug: string;
}

interface AtelierPostsProps {
  popularPosts: PopularPost[];
  /** پست‌های پیش‌نویس اخیر (اختیاری، برای فیلتر). */
  recentDrafts?: Array<{ id: string; title: string; date: string; author: string }>;
}

type FilterKey = 'all' | 'popular' | 'drafts';

const FILTER_OPTIONS: ReadonlyArray<{ key: FilterKey; label: string; icon: React.ReactNode }> = [
  { key: 'all', label: 'همه', icon: <HiOutlineSparkles className="w-3 h-3" aria-hidden /> },
  {
    key: 'popular',
    label: 'پربازدید',
    icon: <HiOutlineArrowTrendingUp className="w-3 h-3" aria-hidden />,
  },
  {
    key: 'drafts',
    label: 'پیش‌نویس',
    icon: <HiOutlineDocumentText className="w-3 h-3" aria-hidden />,
  },
];

const FILTER_STORAGE_KEY = 'at:posts-filter';

function loadStoredFilter(): FilterKey {
  if (typeof window === 'undefined') return 'all';
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw === 'all' || raw === 'popular' || raw === 'drafts') return raw;
  } catch {
    // localStorage might be blocked (private mode) — ignore.
  }
  return 'all';
}

/** محاسبهٔ trend برای یک پست نسبت به میانگین. */
function trendBadge(delta: number): { tone: 'up' | 'down' | 'flat'; label: string } {
  if (Math.abs(delta) < 5) return { tone: 'flat', label: '—' };
  return {
    tone: delta > 0 ? 'up' : 'down',
    label: `${delta > 0 ? '+' : ''}${fmt(Math.round(delta))}٪`,
  };
}

export default function AtelierPosts({ popularPosts, recentDrafts = [] }: AtelierPostsProps) {
  const [filter, setFilter] = useState<FilterKey>('all');

  // Hydrate filter از localStorage پس از mount (جلوگیری از SSR mismatch).
  useEffect(() => {
    setFilter(loadStoredFilter());
  }, []);

  // ذخیرهٔ انتخاب فعلی.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, filter);
    } catch {
      // ignore
    }
  }, [filter]);

  // ترکیب لیست بر اساس فیلتر.
  const rows = useMemo(() => {
    if (filter === 'drafts') {
      return recentDrafts.slice(0, 6).map<PopularPost>((d) => ({
        id: d.id,
        title: d.title,
        views: 0,
        publishDate: d.date,
        author: d.author,
        slug: '',
      }));
    }
    if (filter === 'popular') {
      // فقط پست‌های با view count بالای میانگین.
      const avg =
        popularPosts.length > 0
          ? popularPosts.reduce((s, p) => s + p.views, 0) / popularPosts.length
          : 0;
      return popularPosts.filter((p) => p.views >= avg).slice(0, 6);
    }
    return popularPosts.slice(0, 6);
  }, [filter, popularPosts, recentDrafts]);

  const featured = rows[0];
  const rest = rows.slice(1);
  const avg = rows.length > 0 ? rows.reduce((s, p) => s + p.views, 0) / rows.length : 0;

  return (
    <section className="at-tile at-posts" aria-label="پست‌های پربازدید">
      <header className="at-head">
        <div className="at-head__title">
          <span className="at-head__ico" aria-hidden>
            <HiOutlineChartBar className="w-3.5 h-3.5" />
          </span>
          <div className="at-head__text">
            <h2 className="at-head__title-text">پست‌های پربازدید</h2>
            <p className="at-head__sub">
              {rows.length > 0 ? `${fmt(rows.length)} پست` : 'بدون پست'}
            </p>
          </div>
        </div>

        <div className="at-posts__filters" role="radiogroup" aria-label="فیلتر پست‌ها">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={filter === opt.key}
              onClick={() => setFilter(opt.key)}
              className={`at-posts__filter${filter === opt.key ? ' is-active' : ''}`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <Link href="/dashboard/posts" className="at-head__more">
          <span>همه</span>
          <HiOutlineArrowLeft className="w-3 h-3" aria-hidden />
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="at-posts__empty-state" role="status">
          <span className="at-posts__empty-ico" aria-hidden>
            <HiOutlinePencilSquare className="w-5 h-5" />
          </span>
          <div className="at-posts__empty-text">
            <p className="at-posts__empty-title">
              {filter === 'drafts' ? 'پیش‌نویسی برای نمایش نیست' : 'هنوز پستی منتشر نشده'}
            </p>
            <p className="at-posts__empty-sub">
              {filter === 'drafts'
                ? 'اولین پیش‌نویس را با «نوشتن پست» شروع کنید.'
                : 'اولین پست را با دکمهٔ زیر بنویسید.'}
            </p>
          </div>
          <Link href="/dashboard/posts/create" className="at-posts__empty-cta">
            نوشتن پست جدید
          </Link>
        </div>
      ) : (
        <div className="at-posts__body">
          {/* Featured (پست شماره ۱) */}
          {featured && (
            <article className="at-posts__feature" aria-label="پست ویژه">
              <div className="at-posts__feature-rank" aria-hidden>
                <span className="at-posts__feature-rank-num">۰۱</span>
                <span className="at-posts__feature-rank-sub">پست برتر</span>
              </div>

              <div className="at-posts__feature-body">
                <Link
                  href={featured.slug ? `/blog/${featured.slug}` : '/dashboard/posts'}
                  className="at-posts__feature-title-link"
                  aria-label={`باز کردن پست: ${featured.title}`}
                >
                  <h3 className="at-posts__feature-title" dir="rtl">
                    {featured.title}
                  </h3>
                </Link>

                <p className="at-posts__feature-meta">
                  <span className="at-posts__feature-author">{featured.author}</span>
                  <span aria-hidden>·</span>
                  <span>{featured.publishDate}</span>
                </p>

                <div className="at-posts__feature-stats">
                  <span className="at-posts__feature-views">
                    <HiOutlineEye className="w-3 h-3" aria-hidden />
                    <span className="tabular-nums">{fmt(featured.views)}</span>
                    <span className="at-posts__feature-views-label">بازدید</span>
                  </span>
                  {avg > 0 && (
                    <span
                      className={`at-posts__feature-trend is-${trendBadge(((featured.views - avg) / avg) * 100).tone}`}
                    >
                      <HiOutlineArrowTrendingUp className="w-3 h-3" aria-hidden />
                      <span className="tabular-nums">
                        {trendBadge(((featured.views - avg) / avg) * 100).label}
                      </span>
                      <span>نسبت به میانگین</span>
                    </span>
                  )}
                </div>

                <Link
                  href={featured.slug ? `/blog/${featured.slug}` : '/dashboard/posts'}
                  className="at-posts__feature-cta"
                  aria-label={`ادامهٔ مطلب: ${featured.title}`}
                >
                  <span>خواندن پست</span>
                  <HiOutlineArrowLeft className="w-3.5 h-3.5" aria-hidden />
                </Link>
              </div>
            </article>
          )}

          {/* Ranked list (پست‌های ۲..۶) */}
          {rest.length > 0 && (
            <ol className="at-posts__list">
              {rest.map((post, i) => {
                const rank = i + 2; // شماره رتبه از ۲ شروع می‌شود.
                return (
                  <li key={post.id} className="at-posts__row">
                    <Link
                      href={post.slug ? `/blog/${post.slug}` : '/dashboard/posts'}
                      className="at-postrow"
                    >
                      <span className="at-postrow__rank" aria-hidden>
                        <span className="at-postrow__rank-num">{fmt(rank).padStart(2, '۰')}</span>
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
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
