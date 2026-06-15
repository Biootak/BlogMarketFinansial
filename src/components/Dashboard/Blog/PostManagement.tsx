'use client';

import type React from 'react';
import Link from 'next/link';
import { motion } from '@/lib/motion-shim';
import {
  HiOutlinePencilAlt,
  HiOutlineEye,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineClock,
  HiPencil,
  HiOutlineSparkles,
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
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } 
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
        className="flex flex-col sm:flex-row justify-between items-center gap-5"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl blur-lg opacity-40" />
            <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl">
              <HiOutlineDocumentText className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              مدیریت پست‌ها
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              مشاهده و مدیریت محتوای وبلاگ
            </p>
          </div>
        </div>
        
        <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/dashboard/posts/create"
            className="group relative inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm overflow-hidden transition-all duration-300"
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
            <HiOutlinePlus className="relative w-5 h-5 text-white" />
            <span className="relative text-white">ایجاد پست جدید</span>
            <HiOutlineSparkles className="relative w-4 h-4 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
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

      {/* Posts Grid */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
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
        className={`relative bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 border-b-4 ${colors.border} transition-all duration-500`}
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
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(circle at 70% 30%, ${colors.glow}, transparent 70%)` }}
        />
        
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1.5">{title}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {value.toLocaleString('fa-IR')}
            </p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="relative"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.iconBg} rounded-2xl blur-lg opacity-40`} />
            <div className={`relative p-3.5 rounded-2xl bg-gradient-to-br ${colors.iconBg} text-white shadow-xl ${colors.iconShadow}`}>
              <Icon className="w-6 h-6" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};


const PopularPosts: React.FC<{ posts: PostManagementProps['popularPosts'] }> = ({ posts }) => (
  <div 
    className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    style={{
      boxShadow: `
        0 0 0 1px rgba(0,0,0,0.03),
        0 4px 6px rgba(0,0,0,0.02),
        0 12px 24px rgba(0,0,0,0.04)
      `,
    }}
  >
    {/* Header */}
    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur-md opacity-40" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <HiOutlineChartBar className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            پست‌های محبوب
          </h3>
        </div>
        <Link
          href="/dashboard/posts"
          className="group flex items-center gap-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-semibold transition-colors duration-200"
        >
          <span>مشاهده همه</span>
          <HiOutlineArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
        </Link>
      </div>
    </div>
    
    {/* List */}
    <div className="p-4">
      <ul className="space-y-2">
        {posts.map((post, index) => (
          <motion.li
            key={post.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="group flex items-center justify-between p-3.5 rounded-2xl hover:bg-gradient-to-r hover:from-violet-50/80 hover:to-purple-50/50 dark:hover:from-slate-800/80 dark:hover:to-slate-800/50 transition-all duration-300">
              <Link href={`/single/${post.slug}`} className="flex-grow min-w-0">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors duration-200">
                  {post.title}
                </h4>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{post.author}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>{post.publishDate}</span>
                </div>
              </Link>
              <Link
                href={`/dashboard/posts/edit/${post.id}`}
                className="flex-shrink-0 mr-3 p-2.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:scale-110"
              >
                <HiPencil className="w-4 h-4" />
              </Link>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  </div>
);

const RecentDrafts: React.FC<{ drafts: PostManagementProps['recentDrafts'] }> = ({ drafts }) => (
  <div 
    className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    style={{
      boxShadow: `
        0 0 0 1px rgba(0,0,0,0.03),
        0 4px 6px rgba(0,0,0,0.02),
        0 12px 24px rgba(0,0,0,0.04)
      `,
    }}
  >
    {/* Header */}
    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-md opacity-40" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <HiOutlineClock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            پیش‌نویس‌های اخیر
          </h3>
        </div>
        <Link
          href="/dashboard/posts?filter=draft"
          className="group flex items-center gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-semibold transition-colors duration-200"
        >
          <span>مشاهده همه</span>
          <HiOutlineArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
        </Link>
      </div>
    </div>
    
    {/* List */}
    <div className="p-4">
      <ul className="space-y-2">
        {drafts.map((draft, index) => (
          <motion.li
            key={draft.id}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="group flex items-center justify-between p-3.5 rounded-2xl hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/50 dark:hover:from-slate-800/80 dark:hover:to-slate-800/50 transition-all duration-300">
              <Link href={`/dashboard/posts/${draft.id}/edit`} className="flex-grow min-w-0">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {draft.title}
                </h4>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>{draft.author}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>{draft.date}</span>
                </div>
              </Link>
              <Link
                href={`/dashboard/posts/edit/${draft.id}`}
                className="flex-shrink-0 mr-3 p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-110"
              >
                <HiPencil className="w-4 h-4" />
              </Link>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  </div>
);

export default PostManagement;
