'use client';

import React, { type FC } from 'react';
import CardAuthorBox from '@/components/CardAuthorBox/CardAuthorBox';
import type { TopAuthor } from '@/actions/getTopAuthors';
import { motion } from 'framer-motion';
import { Crown, Users } from 'lucide-react';

export interface SectionGridAuthorBoxProps {
  className?: string;
  authors: TopAuthor[];
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
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const SectionGridAuthorBox: FC<SectionGridAuthorBoxProps> = ({ className = '', authors }) => {
  const topAuthors = authors
    .sort((a, b) => (b._count?.posts ?? 0) - (a._count?.posts ?? 0))
    .slice(0, 5);

  if (topAuthors.length === 0) {
    return null;
  }

  return (
    <section className={`nc-SectionGridAuthorBox relative ${className}`}>
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-amber-100/80 dark:bg-amber-900/30 rounded-full mb-3 sm:mb-4">
          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">
            رتبه‌بندی بر اساس تعداد مقالات
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white flex items-center justify-center gap-2 sm:gap-3">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-primary-500" />
          ۵ نویسنده برتر ماه
        </h2>
        <div className="mt-2 sm:mt-3 mx-auto w-16 sm:w-20 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" />
      </div>

      {/* Authors Grid */}
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {topAuthors.map((author, index) => (
          <motion.div key={author.id} variants={itemVariants}>
            <CardAuthorBox author={author} index={index} />
          </motion.div>
        ))}
      </motion.div>

      {/* Background Decorations */}
      <div className="absolute -top-10 start-1/4 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 end-1/4 w-40 h-40 bg-primary-400/10 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
};

export default SectionGridAuthorBox;
