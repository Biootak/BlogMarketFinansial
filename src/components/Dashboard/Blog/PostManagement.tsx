'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type React from 'react';
import { ArrowLeft, BarChart3, Clock, Edit, Eye, FileText, Pencil, Plus, Sparkles } from 'lucide-react';;;

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
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const PostManagement: React.FC<PostManagementProps> = ({ stats, popularPosts, recentDrafts }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 lg:gap-5"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl sm:rounded-2xl blur-lg opacity-40" />
            <div className="relative p-2 sm:p-2.5 lg:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
              مدیریت پست‌ها
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
              مشاهده و مدیریت محتوای وبلاگ
            </p>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="w-full sm:w-auto"
        >
          <Link
            href="/dashboard/posts/create"
            className="group relative inline-flex items-center justify-center w-full sm:w-auto gap-2 sm:gap-2.5 lg:gap-3 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm overflow-hidden transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              boxShadow: `
                0 0 0 1px rgba(124,58,237,0.5),
                0 4px 6px -1px rgba(0,0,0,0.1),
                0 10px 20px -5px rgba(124,58,237,0.4),
                inset 0 1px 0 rgba(255,255,255,0.2)
              `,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Plus className="relative w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="relative text-white">ایجاد پست جدید</span>
            <Sparkles className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            icon={FileText}
            title="کل پست‌ها"
            value={stats.totalPosts}
            color="violet"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            icon={Edit}
            title="پیش‌نویس‌ها"
            value={stats.totalDrafts}
            color="blue"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard icon={Eye} title="بازدیدها" value={stats.totalViews} color="emerald" />
        </motion.div>
      </motion.div>

      {/* Posts Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6"
      >
        <motion.div variants={itemVariants}>
          <PopularPosts posts={popularPosts} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <RecentDrafts drafts={recentDrafts} />
        </motion.div>
      </motion.div>
    </motion.div>
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
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden"
    >
      <div
        className={`relative bg-white dark:bg-slate-900 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 border-b-2 sm:border-b-4 ${colors.border} transition-all duration-500`}
        style={{
          boxShadow: `
            0 0 0 1px rgba(0,0,0,0.03),
            0 2px 4px rgba(0,0,0,0.02),
            0 8px 16px rgba(0,0,0,0.04)
          `,
        }}
      >
        {/* Hover glow */}
        <div
          className="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 70% 30%, ${colors.glow}, transparent 70%)`,
          }}
        />

        <div className="relative flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">
              {title}
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {value.toLocaleString('fa-IR')}
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="relative flex-shrink-0"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${colors.iconBg} rounded-xl sm:rounded-2xl blur-lg opacity-40`}
            />
            <div
              className={`relative p-2 sm:p-2.5 lg:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br ${colors.iconBg} text-white shadow-xl ${colors.iconShadow}`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const PopularPosts: React.FC<{ posts: PostManagementProps['popularPosts'] }> = ({ posts }) => (
  <div
    className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden group/card"
    style={{
      boxShadow: `
        0 0 0 1px rgba(0,0,0,0.03),
        0 4px 6px rgba(0,0,0,0.02),
        0 12px 24px rgba(0,0,0,0.04)
      `,
    }}
  >
    {/* Decorative gradient */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

    {/* Header */}
    <div className="px-4 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg sm:rounded-xl blur-md opacity-40" />
            <div className="relative p-1.5 sm:p-2 lg:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 dark:text-white">
              پست‌های محبوب
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              پربازدیدترین مطالب
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/posts"
          className="group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-violet-100 dark:hover:bg-violet-900/30 flex-shrink-0"
        >
          <span className="hidden sm:inline">مشاهده همه</span>
          <span className="sm:hidden">همه</span>
          <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:-translate-x-1 transition-transform duration-200" />
        </Link>
      </div>
    </div>

    {/* List */}
    <div className="p-3 sm:p-4">
      <ul className="space-y-1 sm:space-y-1.5">
        {posts.map((post, index) => (
          <motion.li
            key={post.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="group relative flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl hover:bg-gradient-to-r hover:from-violet-50/80 hover:to-purple-50/50 dark:hover:from-slate-800/80 dark:hover:to-slate-800/50 transition-all duration-300 border border-transparent hover:border-violet-200 dark:hover:border-violet-800">
              {/* Rank Badge */}
              <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-lg">
                {index + 1}
              </div>

              {/* Content */}
              <Link href={`/single/${post.slug}`} className="flex-grow min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white mb-0.5 line-clamp-1 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors duration-200">
                  {post.title}
                </h4>
                <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                  <Eye className="w-3 h-3 flex-shrink-0" />
                  <span className="font-medium">{post.views.toLocaleString('fa-IR')}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                  <span className="truncate">{post.author}</span>
                </div>
              </Link>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/single/${post.slug}`}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:scale-110"
                  title="مشاهده"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
                <Link
                  href={`/dashboard/posts/edit/${post.id}`}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-110"
                  title="ویرایش"
                >
                  <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  </div>
);

const RecentDrafts: React.FC<{ drafts: PostManagementProps['recentDrafts'] }> = ({ drafts }) => (
  <div
    className="relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden group/card"
    style={{
      boxShadow: `
        0 0 0 1px rgba(0,0,0,0.03),
        0 4px 6px rgba(0,0,0,0.02),
        0 12px 24px rgba(0,0,0,0.04)
      `,
    }}
  >
    {/* Decorative gradient */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

    {/* Header */}
    <div className="px-4 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 gradient-primary-br rounded-lg sm:rounded-xl blur-md opacity-40" />
            <div className="relative p-1.5 sm:p-2 lg:p-2.5 rounded-lg sm:rounded-xl gradient-primary-br text-white shadow-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 dark:text-white">
              پیش‌نویس‌های اخیر
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              مطالب در حال تکمیل
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/posts?filter=draft"
          className="group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs sm:text-sm font-semibold transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex-shrink-0"
        >
          <span className="hidden sm:inline">مشاهده همه</span>
          <span className="sm:hidden">همه</span>
          <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:-translate-x-1 transition-transform duration-200" />
        </Link>
      </div>
    </div>

    {/* List */}
    <div className="p-3 sm:p-4">
      <ul className="space-y-1 sm:space-y-1.5">
        {drafts.map((draft, index) => (
          <motion.li
            key={draft.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="group relative flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/50 dark:hover:from-slate-800/80 dark:hover:to-slate-800/50 transition-all duration-300 border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
              {/* Draft Icon */}
              <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg gradient-primary-br text-white shadow-lg">
                <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>

              {/* Content */}
              <Link href={`/dashboard/posts/edit/${draft.id}`} className="flex-grow min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white mb-0.5 line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {draft.title}
                </h4>
                <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{draft.date}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                  <span className="truncate">{draft.author}</span>
                </div>
              </Link>

              {/* Edit Button */}
              <Link
                href={`/dashboard/posts/edit/${draft.id}`}
                className="flex-shrink-0 p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-110"
                title="ویرایش"
              >
                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  </div>
);

export default PostManagement;
