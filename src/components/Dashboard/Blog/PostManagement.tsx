'use client';

/**
 * PostManagement — 2026 redesign.
 *
 * Now a 2-column list panel (Popular + Recent Drafts). The previous
 * version included its own KPI cards and a "create post" button, but
 * those are surfaced elsewhere on the dashboard (KpiBento + Welcome
 * hero) and were creating visual duplication.
 *
 * Two optional booleans let callers restore the legacy sections:
 *   • showHeaderStats  — re-enables the 3 stat cards strip
 *   • showCreateButton — re-enables the inline "create post" CTA
 *
 * Accessibility:
 *   • The component is a <section> with an aria-label.
 *   • List rows are real <a> tags with focus rings.
 *   • All numeric values use the .dash-num class for tabular alignment.
 */

import { motion } from '@/lib/motion-shim';
import Link from 'next/link';
import type React from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePencilAlt,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiPencil,
} from 'react-icons/hi';

interface PostManagementProps {
  stats: {
    totalPosts: number;
    totalDrafts: number;
    totalViews: number;
  };
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
  showHeaderStats?: boolean;
  showCreateButton?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const PostManagement: React.FC<PostManagementProps> = ({
  stats,
  popularPosts,
  recentDrafts,
  showHeaderStats = true,
  showCreateButton = true,
}) => {
  return (
    <section aria-label="مدیریت پست‌ها" className="space-y-5">
      {/* Header */}
      {(showHeaderStats || showCreateButton) && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="dash-ico dash-ico--violet w-11 h-11 shrink-0" aria-hidden="true">
              <HiOutlineDocumentText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                مدیریت پست‌ها
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                مشاهده و مدیریت محتوای وبلاگ
              </p>
            </div>
          </div>

          {showCreateButton && (
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/dashboard/posts/create"
                className="group inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                style={{
                  background:
                    'linear-gradient(135deg, oklch(70% 0.16 270) 0%, oklch(58% 0.16 285) 100%)',
                  boxShadow:
                    '0 1px 0 oklch(100% 0 0 / 0.18) inset, 0 8px 24px -10px oklch(55% 0.18 280 / 0.55)',
                }}
              >
                <HiOutlinePlus className="w-4 h-4" />
                <span>ایجاد پست جدید</span>
                <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-200 opacity-70" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Stat cards (optional) */}
      {showHeaderStats && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              icon={HiOutlineDocumentText}
              title="کل پست‌ها"
              value={stats.totalPosts}
              color="violet"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={HiOutlinePencilAlt}
              title="پیش‌نویس‌ها"
              value={stats.totalDrafts}
              color="blue"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={HiOutlineEye}
              title="بازدیدها"
              value={stats.totalViews}
              color="emerald"
            />
          </motion.div>
        </motion.div>
      )}

      {/* Posts Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5"
      >
        <motion.div variants={itemVariants}>
          <PopularPosts posts={popularPosts} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <RecentDrafts drafts={recentDrafts} />
        </motion.div>
      </motion.div>
    </section>
  );
};

const colorClasses = {
  violet: {
    iconBg: 'from-violet-500 to-purple-600',
    iconShadow: 'shadow-violet-500/30',
    border: 'border-violet-500',
    glow: 'rgba(139,92,246,0.15)',
  },
  blue: {
    iconBg: 'from-blue-500 to-indigo-600',
    iconShadow: 'shadow-blue-500/30',
    border: 'border-blue-500',
    glow: 'rgba(59,130,246,0.15)',
  },
  emerald: {
    iconBg: 'from-emerald-500 to-teal-600',
    iconShadow: 'shadow-emerald-500/30',
    border: 'border-emerald-500',
    glow: 'rgba(16,185,129,0.15)',
  },
};

const StatCard: React.FC<{
  icon: React.ElementType;
  title: string;
  value: number;
  color: 'violet' | 'blue' | 'emerald';
}> = ({ icon: Icon, title, value, color }) => {
  const colors = colorClasses[color];

  return (
    <div className="group relative overflow-hidden">
      <div
        className={`relative dash-panel dash-panel--hover dash-glow p-5 border-b-4 ${colors.border}`}
      >
        <div
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 70% 30%, ${colors.glow}, transparent 70%)`,
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1.5">{title}</p>
            <p className="dash-num text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {value.toLocaleString('fa-IR')}
            </p>
          </div>
          <div className="relative">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${colors.iconBg} rounded-2xl blur-lg opacity-40`}
              aria-hidden="true"
            />
            <div
              className={`relative p-3 rounded-2xl bg-gradient-to-br ${colors.iconBg} text-white shadow-xl ${colors.iconShadow}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PopularPosts: React.FC<{ posts: PostManagementProps['popularPosts'] }> = ({ posts }) => (
  <article className="relative dash-panel overflow-hidden h-full flex flex-col">
    <header className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="dash-ico dash-ico--violet w-10 h-10 shrink-0" aria-hidden="true">
          <HiOutlineChartBar className="w-5 h-5" />
        </span>
        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
          پست‌های محبوب
        </h3>
      </div>
      <Link
        href="/dashboard/posts"
        className="group inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-md"
      >
        <span>مشاهده همه</span>
        <HiOutlineArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
      </Link>
    </header>
    <div className="p-3 flex-1">
      {posts.length === 0 ? (
        <EmptyState label="هنوز پست محبوبی ثبت نشده است." />
      ) : (
        <ul className="space-y-1.5">
          {posts.map((post, index) => (
            <motion.li
              key={post.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="group flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-violet-50/60 dark:hover:bg-slate-800/60 transition-colors duration-200">
                <Link
                  href={`/single/${post.slug}`}
                  className="flex-grow min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-md"
                >
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5 line-clamp-1 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors duration-200">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="truncate max-w-[7rem]">{post.author}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>{post.publishDate}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span className="text-violet-600 dark:text-violet-400 font-semibold">
                      {post.views.toLocaleString('fa-IR')} بازدید
                    </span>
                  </div>
                </Link>
                <Link
                  href={`/dashboard/posts/edit/${post.id}`}
                  aria-label={`ویرایش ${post.title}`}
                  className="flex-shrink-0 p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                >
                  <HiPencil className="w-4 h-4" />
                </Link>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  </article>
);

const RecentDrafts: React.FC<{ drafts: PostManagementProps['recentDrafts'] }> = ({ drafts }) => (
  <article className="relative dash-panel overflow-hidden h-full flex flex-col">
    <header className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="dash-ico dash-ico--cyan w-10 h-10 shrink-0" aria-hidden="true">
          <HiOutlineClock className="w-5 h-5" />
        </span>
        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
          پیش‌نویس‌های اخیر
        </h3>
      </div>
      <Link
        href="/dashboard/posts?filter=draft"
        className="group inline-flex items-center gap-1.5 text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 rounded-md"
      >
        <span>مشاهده همه</span>
        <HiOutlineArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
      </Link>
    </header>
    <div className="p-3 flex-1">
      {drafts.length === 0 ? (
        <EmptyState label="پیش‌نویسی برای نمایش وجود ندارد." />
      ) : (
        <ul className="space-y-1.5">
          {drafts.map((draft, index) => (
            <motion.li
              key={draft.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="group flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-cyan-50/60 dark:hover:bg-slate-800/60 transition-colors duration-200">
                <Link
                  href={`/dashboard/posts/edit/${draft.id}`}
                  className="flex-grow min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 rounded-md"
                >
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5 line-clamp-1 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors duration-200">
                    {draft.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="truncate max-w-[7rem]">{draft.author}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>{draft.date}</span>
                  </div>
                </Link>
                <Link
                  href={`/dashboard/posts/edit/${draft.id}`}
                  aria-label={`ادامه نوشتن ${draft.title}`}
                  className="flex-shrink-0 p-2 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                >
                  <HiPencil className="w-4 h-4" />
                </Link>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  </article>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-sm text-slate-500 dark:text-slate-400">
    <span className="dash-ico dash-ico--cyan w-12 h-12 mb-3 opacity-50" aria-hidden="true">
      <HiOutlineDocumentText className="w-5 h-5" />
    </span>
    <p>{label}</p>
  </div>
);

export default PostManagement;
