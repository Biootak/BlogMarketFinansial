'use client';

/**
 * PostsSpotlight — 2026 editorial posts surface.
 *
 * The content filter (همه / محبوب / پیش‌نویس‌ها) is a category filter,
 * not a time-range filter — it stays on this section rather than moving
 * to the persistent Header. Rendered as a sliding indicator tab strip
 * (Linear/Resend pattern) instead of generic chips.
 *
 * Composition:
 *   1. Featured strip — top 3 popular posts as a hero row.
 *   2. Two-column list section: Popular (left) and Recent drafts (right).
 *
 * Every row is a real <Link> with a visible focus ring. The list rows
 * use the shared `.dash-cardlink` so the hover state stays consistent
 * with the rest of the dashboard.
 */

import { motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineSparkles,
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

type PostsFilter = 'all' | 'popular' | 'drafts';

const FILTERS: ReadonlyArray<{ id: PostsFilter; label: string; hint?: string }> = [
  { id: 'all', label: 'همه' },
  { id: 'popular', label: 'محبوب' },
  { id: 'drafts', label: 'پیش‌نویس‌ها' },
];

const FILTER_STORAGE_KEY = 'dash2:posts-filter';

const isPostsFilter = (value: unknown): value is PostsFilter =>
  value === 'all' || value === 'popular' || value === 'drafts';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function PostsSpotlight({ popularPosts, recentDrafts }: PostsSpotlightProps) {
  // Initial state must mirror SSR (where window/localStorage are unavailable).
  // We hydrate from storage in an effect *after* the first paint so the
  // server-rendered HTML and the first client render match exactly.
  const [activeFilter, setActiveFilter] = useState<PostsFilter>('all');
  const [displayFilter, setDisplayFilter] = useState<PostsFilter>('all');
  const [isFading, setIsFading] = useState(false);

  // Hydrate the persisted filter once on mount. StrictMode-safe: we only
  // read when the persisted value actually differs from the current state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
      if (isPostsFilter(stored) && stored !== activeFilter) {
        setActiveFilter(stored);
      }
    } catch {
      // localStorage may be restricted; keep the default.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, activeFilter);
    } catch {
      // Ignore write failures.
    }
  }, [activeFilter]);

  // Sliding indicator on the filter tab strip — same Resend/Linear
  // pattern used in the persistent header's range segmented control.
  const filterRef = useRef<HTMLDivElement | null>(null);
  const filterBtnRefs = useRef<Partial<Record<PostsFilter, HTMLButtonElement | null>>>({});
  useIsomorphicLayoutEffect(() => {
    const parent = filterRef.current;
    const btn = filterBtnRefs.current[displayFilter];
    if (!parent || !btn) return;
    const measure = () => {
      const parentRect = parent.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const x = btnRect.left - parentRect.left;
      parent.style.setProperty('--pf-x', `${x}px`);
      parent.style.setProperty('--pf-w', `${btnRect.width}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    btn && ro.observe(btn);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [displayFilter]);

  useEffect(() => {
    if (activeFilter === displayFilter) return;
    setIsFading(true);
    let fadeInTimer: number | undefined;
    const fadeOutTimer = window.setTimeout(() => {
      setDisplayFilter(activeFilter);
      fadeInTimer = window.setTimeout(() => setIsFading(false), 120);
    }, 120);
    return () => {
      window.clearTimeout(fadeOutTimer);
      if (fadeInTimer !== undefined) window.clearTimeout(fadeInTimer);
    };
  }, [activeFilter, displayFilter]);

  const featured = useMemo(
    () => (displayFilter === 'drafts' ? [] : popularPosts.slice(0, 3)),
    [displayFilter, popularPosts],
  );
  const morePopular = useMemo(
    () => (displayFilter === 'drafts' ? [] : popularPosts.slice(3)),
    [displayFilter, popularPosts],
  );
  const visibleDrafts = useMemo(
    () => (displayFilter === 'popular' ? [] : recentDrafts),
    [displayFilter, recentDrafts],
  );

  const counts = useMemo(
    () => ({
      all: popularPosts.length + recentDrafts.length,
      popular: popularPosts.length,
      drafts: recentDrafts.length,
    }),
    [popularPosts.length, recentDrafts.length],
  );

  return (
    <section id="dash-posts" aria-label="مدیریت پست‌ها" className="dash-pane dash-pane--tall !p-0">
      <header className="px-4 sm:px-5 md:px-7 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <span
            className="dash-ico dash-ico--violet w-10 h-10 sm:w-11 sm:h-11 shrink-0"
            aria-hidden
          >
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

        <Link
          href="/dashboard/posts"
          className="dash-link text-sm px-2 py-1"
        >
          <span>همه پست‌ها</span>
          <HiOutlineArrowLeft className="w-4 h-4" />
        </Link>
      </header>

      {/* Tab-style filter — sliding indicator (Linear/Resend pattern). */}
      <div className="px-4 sm:px-5 md:px-7 pt-4">
        <div
          ref={filterRef}
          className="dash-toolbar__segment"
          role="tablist"
          aria-label="فیلتر پست‌ها"
        >
          <span className="dash-toolbar__segment-indicator" aria-hidden />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              ref={(el) => {
                filterBtnRefs.current[f.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={activeFilter === f.id}
              tabIndex={activeFilter === f.id ? 0 : -1}
              onClick={() => setActiveFilter(f.id)}
              data-active={activeFilter === f.id ? 'true' : undefined}
              className="dash-toolbar__segment-btn"
            >
              <span>{f.label}</span>
              <span className="ms-1.5 text-[10px] tabular-nums opacity-60">
                {counts[f.id].toLocaleString('fa-IR')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn('transition-opacity ease-out', isFading ? 'opacity-0' : 'opacity-100')}
        style={{ transitionDuration: '120ms' }}
      >
        {featured.length > 0 && (
          <div className="px-4 sm:px-5 md:px-7 pt-5">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 inline-flex items-center gap-1.5">
              <HiOutlineSparkles className="w-4 h-4 text-slate-500" />
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
                    className="group relative block h-full rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-800/10 p-4 transition-[border-color,box-shadow] duration-200 hover:border-slate-300/80 dark:hover:border-slate-600/60 hover:shadow-lg hover:shadow-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 text-white dark:text-slate-900 shadow">
                        {i + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 dash-meta font-semibold">
                        <HiOutlineEye className="w-3 h-3" />
                        {post.views.toLocaleString('fa-IR')}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
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
            hidden={displayFilter === 'drafts'}
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
                          <span className="text-slate-700/80 dark:text-slate-300/85 font-semibold">
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
            hidden={displayFilter === 'popular'}
          >
            {visibleDrafts.length === 0 ? (
              <EmptyState label="پیش‌نویس تازه‌ای ندارید." />
            ) : (
              <ul className="space-y-0.5">
                {visibleDrafts.map((draft, i) => (
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
      </div>
    </section>
  );
}

interface PanelProps {
  title: string;
  tone: 'violet' | 'cyan';
  icon: React.ReactNode;
  viewAllHref: string;
  hidden?: boolean;
  children: React.ReactNode;
}

function Panel({ title, tone, icon, viewAllHref, hidden, children }: PanelProps) {
  if (hidden) return null;
  // 2026-06-26: monochrome control shift — accent + link collapsed to
  // slate. The .dash-ico--violet / .dash-ico--cyan hue variants are
  // already neutralized in globals.css §1.5; we keep a single class
  // here so JSX stays declarative.
  const accent = 'dash-ico';
  const link = 'dash-link';
  return (
    <article className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden bg-white/45 backdrop-blur-[24px] dark:bg-slate-900/45">
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
