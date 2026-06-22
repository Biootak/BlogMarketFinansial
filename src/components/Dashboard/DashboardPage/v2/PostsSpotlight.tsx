'use client';

/**
 * PostsSpotlight — 2026 editorial posts surface.
 *
 * Composition (top to bottom):
 *   1. Featured strip — the top 3 popular posts rendered as a horizontal
 *      hero row, each carrying a rank pill + view count + author meta.
 *   2. Two-column list section: Popular (left) and Recent drafts (right).
 *
 * Every row is a real <Link> with a visible focus ring. The list rows use
 * .dash-cardlink so the hover state is consistent across the dashboard.
 */

import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import {
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineArrowLeft,
  HiOutlinePencil,
  HiOutlineEye,
  HiOutlineSparkles,
  HiOutlineDocumentText,
} from 'react-icons/hi2';

interface PostsSpotlightProps {
  popularPosts: Array<{
    id: string;
    title: string;
    views: number;
    publishDate: string;
    author: string;
    slug: string;
  }>;
  recentDrafts: Array<{
    id: string;
    title: string;
    date: string;
    author: string;
  }>;
}

export default function PostsSpotlight({ popularPosts, recentDrafts }: PostsSpotlightProps) {
  const featured = popularPosts.slice(0, 3);
  const morePopular = popularPosts.slice(3);

  return (
    <section
      id="dash-posts"
      aria-label="مدیریت پست‌ها"
      className="dash-pane dash-pane--tall !p-0"
    >
      <header className="px-4 sm:px-5 md:px-7 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <span className="dash-ico dash-ico--violet w-10 h-10 sm:w-11 sm:h-11 shrink-0" aria-hidden>
            <HiOutlineDocumentText className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              مدیریت پست‌ها
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              پست‌های ویژه، پربازدید و پیش‌نویس‌های اخیر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/posts"
            className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-md px-2 py-1"
          >
            <span>همه پست‌ها</span>
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {featured.length > 0 && (
        <div className="px-4 sm:px-5 md:px-7 pt-4 sm:pt-5">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 inline-flex items-center gap-1.5">
            <HiOutlineSparkles className="w-4 h-4 text-violet-500" />
            <span>ویژه‌ی این هفته</span>
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featured.map((post, i) => (
              <motion.li
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: 0.05 * i,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={`/single/${post.slug}`}
                  className="group relative block h-full rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-800/10 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300/70 dark:hover:border-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow">
                      {i + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300 tabular-nums">
                      <HiOutlineEye className="w-3 h-3" />
                      {post.views.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                    {post.title}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="truncate max-w-[7rem]">{post.author}</span>
                    <span>{post.publishDate}</span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 sm:px-5 md:px-7 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Panel
          title="پربازدیدترین‌ها"
          tone="violet"
          icon={<HiOutlineChartBar className="w-5 h-5" />}
          viewAllHref="/dashboard/posts?sort=views"
        >
          {morePopular.length === 0 ? (
            <EmptyState label="هنوز پست پربازدیدی ثبت نشده است." />
          ) : (
            <ul className="space-y-0.5">
              {morePopular.map((post, i) => (
                <motion.li
                  key={post.id}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(0.04 * i, 0.25),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link href={`/single/${post.slug}`} className="dash-cardlink group">
                    <span className="dash-ico dash-ico--violet w-9 h-9 shrink-0" aria-hidden>
                      <HiOutlineDocumentText className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <p className="dash-cardlink__title">{post.title}</p>
                      <p className="dash-cardlink__meta">
                        <span className="truncate max-w-[7rem]">{post.author}</span>
                        <span className="dash-cardlink__dot" aria-hidden />
                        <span>{post.publishDate}</span>
                        <span className="dash-cardlink__dot" aria-hidden />
                        <span className="text-violet-600 dark:text-violet-400 font-semibold">
                          {post.views.toLocaleString('fa-IR')} بازدید
                        </span>
                      </p>
                    </span>
                    <HiOutlineArrowLeft className="w-3.5 h-3.5 text-slate-400 transition-transform group-hover:-translate-x-0.5" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="پیش‌نویس‌های اخیر"
          tone="cyan"
          icon={<HiOutlineClock className="w-5 h-5" />}
          viewAllHref="/dashboard/posts?filter=draft"
        >
          {recentDrafts.length === 0 ? (
            <EmptyState label="پیش‌نویس تازه‌ای ندارید." />
          ) : (
            <ul className="space-y-0.5">
              {recentDrafts.map((draft, i) => (
                <motion.li
                  key={draft.id}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(0.04 * i, 0.25),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Link
                    href={`/dashboard/posts/edit/${draft.id}`}
                    className="dash-cardlink group"
                  >
                    <span className="dash-ico dash-ico--cyan w-9 h-9 shrink-0" aria-hidden>
                      <HiOutlinePencil className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <p className="dash-cardlink__title">{draft.title}</p>
                      <p className="dash-cardlink__meta">
                        <span className="truncate max-w-[7rem]">{draft.author}</span>
                        <span className="dash-cardlink__dot" aria-hidden />
                        <span>{draft.date}</span>
                      </p>
                    </span>
                    <HiOutlineArrowLeft className="w-3.5 h-3.5 text-slate-400 transition-transform group-hover:-translate-x-0.5" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

interface PanelProps {
  title: string;
  tone: 'violet' | 'cyan';
  icon: React.ReactNode;
  viewAllHref: string;
  children: React.ReactNode;
}

function Panel({ title, tone, icon, viewAllHref, children }: PanelProps) {
  const accent =
    tone === 'violet' ? 'dash-ico--violet' : 'dash-ico--cyan';
  const link =
    tone === 'violet'
      ? 'text-violet-600 hover:text-violet-700 dark:text-violet-400 focus-visible:ring-violet-400/60'
      : 'text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 focus-visible:ring-cyan-400/60';
  return (
    <article className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden bg-white/60 dark:bg-slate-900/40">
      <header className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
          <span className={`dash-ico ${accent} w-8 h-8`} aria-hidden>
            {icon}
          </span>
          {title}
        </h4>
        <Link
          href={viewAllHref}
          className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 rounded-md px-1 ${link}`}
        >
          <span>مشاهده همه</span>
          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </header>
      <div className="p-2">{children}</div>
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-sm text-slate-500 dark:text-slate-400">
      <span className="dash-ico dash-ico--cyan w-12 h-12 mb-3 opacity-50" aria-hidden>
        <HiOutlineDocumentText className="w-5 h-5" />
      </span>
      <p>{label}</p>
    </div>
  );
}