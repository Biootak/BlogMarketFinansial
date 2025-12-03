'use client';

import type React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  HiOutlinePencilAlt,
  HiOutlineEye,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineClock,
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
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: 'easeOut' as const } 
  },
};

const PostManagement: React.FC<PostManagementProps> = ({ stats, popularPosts, recentDrafts }) => {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-center gap-4"
      >
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          مدیریت پست‌ها
        </h2>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/dashboard/posts/create"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center transition-all duration-200 shadow-lg shadow-violet-500/25 font-medium text-sm"
          >
            <HiOutlinePlus className="w-5 h-5 ml-2" />
            ایجاد پست جدید
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
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
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    border: 'border-violet-500',
  },
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    border: 'border-blue-500',
  },
  emerald: {
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    border: 'border-emerald-500',
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
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-200 dark:border-slate-800 border-b-4 ${colors.border}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className={`${colors.iconBg} p-3 rounded-xl text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

const PopularPosts: React.FC<{ posts: PostManagementProps['popularPosts'] }> = ({ posts }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow duration-300">
    <div className="flex justify-between items-center mb-5">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white ml-3">
          <HiOutlineChartBar className="w-5 h-5" />
        </div>
        پست‌های محبوب
      </h3>
      <Link
        href="/dashboard/posts"
        className="text-violet-600 hover:text-violet-700 dark:text-violet-400 flex items-center text-sm font-medium transition-colors duration-200"
      >
        مشاهده همه
        <HiOutlineArrowLeft className="w-4 h-4 mr-1" />
      </Link>
    </div>
    <ul className="space-y-3">
      {posts.map((post, index) => (
        <motion.li
          key={post.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 rounded-lg p-2 -mx-2">
            <Link href={`/single/${post.slug}`} className="flex-grow">
              <h4 className="font-medium text-slate-900 dark:text-white mb-1 line-clamp-1">
                {post.title}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {post.author} - {post.publishDate}
              </p>
            </Link>
            <Link
              href={`/dashboard/posts/edit/${post.id}`}
              className="mr-3 p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20"
            >
              <HiPencil className="w-4 h-4" />
            </Link>
          </div>
        </motion.li>
      ))}
    </ul>
  </div>
);

const RecentDrafts: React.FC<{ drafts: PostManagementProps['recentDrafts'] }> = ({ drafts }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow duration-300">
    <div className="flex justify-between items-center mb-5">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white ml-3">
          <HiOutlineClock className="w-5 h-5" />
        </div>
        پیش‌نویس‌های اخیر
      </h3>
      <Link
        href="/dashboard/posts?filter=draft"
        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center text-sm font-medium transition-colors duration-200"
      >
        مشاهده همه
        <HiOutlineArrowLeft className="w-4 h-4 mr-1" />
      </Link>
    </div>
    <ul className="space-y-3">
      {drafts.map((draft, index) => (
        <motion.li
          key={draft.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-b-0 last:pb-0"
        >
          <div className="flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 rounded-lg p-2 -mx-2">
            <Link href={`/dashboard/posts/${draft.id}/edit`} className="flex-grow">
              <h4 className="font-medium text-slate-900 dark:text-white mb-1 line-clamp-1">
                {draft.title}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {draft.author} - {draft.date}
              </p>
            </Link>
            <Link
              href={`/dashboard/posts/edit/${draft.id}`}
              className="mr-3 p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <HiPencil className="w-4 h-4" />
            </Link>
          </div>
        </motion.li>
      ))}
    </ul>
  </div>
);

export default PostManagement;
