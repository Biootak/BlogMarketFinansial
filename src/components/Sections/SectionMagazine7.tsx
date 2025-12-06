'use client';

import Card10 from '@/components/Card10/Card10';
import Card10V3 from '@/components/Card10/Card10V3';
import type { PostWithRelations } from '@/types/types';
import { motion } from 'framer-motion';
import { ArrowLeft, Images } from 'lucide-react';;;
import Link from 'next/link';
import type { FC } from 'react';

export interface SectionMagazine7Props {
  posts: PostWithRelations[];
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const SectionMagazine7: FC<SectionMagazine7Props> = ({ posts = [], className = '' }) => {
  return (
    <section className={`nc-SectionMagazine7 relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative">
            <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl sm:rounded-2xl blur-md sm:blur-lg opacity-30" />
            <div className="relative p-2 sm:p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl sm:rounded-2xl shadow-lg">
              <Images className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-neutral-900 dark:text-white">
              مرور محتواهای دیدنی
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 sm:mt-1">
              بیش از {posts.length} مقاله با گالری
            </p>
          </div>
        </div>

        <Link
          href="/archive"
          className="group flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg sm:rounded-xl transition-all duration-200"
        >
          <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
            مشاهده همه
          </span>
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:-translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Content Grid */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {/* Featured Row - 2 Large Cards */}
        <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-2">
          {posts.slice(0, 2).map((post, index) => (
            <motion.div key={post.id} variants={itemVariants}>
              <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 transition-all duration-200 hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 hover:-translate-y-1">
                <Card10V3 post={post} galleryType={index === 1 ? 2 : 1} className="h-full" />
                {/* Decorative gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl sm:rounded-3xl" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Secondary Row - 4 Smaller Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mt-2 sm:mt-3">
          {posts.slice(2, 6).map((post) => (
            <motion.div key={post.id} variants={itemVariants}>
              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl bg-white dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 transition-all duration-200 hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 hover:-translate-y-1">
                <Card10 post={post} className="h-full" />
                {/* Decorative gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl sm:rounded-2xl lg:rounded-3xl" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Background Decoration */}
      <div className="absolute -top-20 -end-20 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -start-20 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
};

export default SectionMagazine7;
