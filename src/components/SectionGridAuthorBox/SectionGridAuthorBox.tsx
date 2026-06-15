'use client';

import React, { type FC } from 'react';
import Link from 'next/link';
import CardAuthorBox from '@/components/CardAuthorBox/CardAuthorBox';
import type { TopAuthor } from '@/actions/getTopAuthors';
import { motion } from '@/lib/motion-shim';
import { Crown } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';

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
      <SectionHeader
        icon={<Crown className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.25} />}
        title="نویسندگان برتر"
        subtitle={`${topAuthors.length} نویسنده فعال این ماه بر اساس تعداد مقالات`}
        accent="amber"
        viewAll={{ label: 'مشاهده همه', href: '/authors' }}
      />

      {/* Authors Grid */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
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
    </section>
  );
};

export default SectionGridAuthorBox;
