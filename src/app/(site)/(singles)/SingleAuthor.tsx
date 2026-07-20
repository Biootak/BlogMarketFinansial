'use client';

import Avatar from '@/components/Avatar/Avatar';
import { motion } from '@/lib/motion-shim';
import type { UserWithProfile } from '@/types/types';
import Link from 'next/link';
import type React from 'react';
import { HiArrowLeft, HiPencilSquare } from 'react-icons/hi2';

export interface SingleAuthorProps {
  author?: UserWithProfile;
}

const SingleAuthor: React.FC<SingleAuthorProps> = ({ author }) => {
  if (!author) return null;

  return (
    <motion.div
      className="nc-SingleAuthor group relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glass Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 to-neutral-50/90 dark:from-neutral-900/90 dark:to-neutral-800/90 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-[0_8px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {/* Decorative Background */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{background: 'linear-gradient(135deg, oklch(58% 0.12 165 / 0.06), transparent)'}} />
        <div className="absolute top-0 end-0 w-40 h-40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{background: 'oklch(58% 0.12 165 / 0.09)'}} />

        {/* Content */}
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
          {/* Avatar with Ring */}
          <Link href={`/author/${author.id}`} className="relative flex-shrink-0 group/avatar">
            {/* Animated Ring */}
            <div className="absolute -inset-1.5 rounded-full opacity-0 group-hover/avatar:opacity-100 blur-sm transition-opacity duration-300" style={{background: 'linear-gradient(135deg, var(--ds-brand-500), var(--ds-brand-700))'}} />
            <div className="relative rounded-full p-0.5" style={{background: 'linear-gradient(135deg, var(--ds-brand-500), var(--ds-brand-700))'}}>
              <div className="rounded-full bg-white dark:bg-neutral-900 p-0.5">
                <Avatar
                  imgUrl={author.profile?.avatar}
                  userName={author.name}
                  sizeClass="h-16 w-16 sm:h-20 sm:w-20 text-xl sm:text-2xl"
                />
              </div>
            </div>
          </Link>

          {/* Info */}
          <div className="flex-grow min-w-0">
            {/* Label */}
            <div className="flex items-center gap-2 mb-2">
              <HiPencilSquare className="w-3.5 h-3.5" style={{color: 'var(--ds-brand-500)'}} />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{color: 'var(--ds-brand-600)'}}>
                نویسنده مطلب
              </span>
            </div>

            {/* Name */}
            <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mb-2 transition-colors duration-300">
              <Link href={`/author/${author.id}`}>{author.name}</Link>
            </h3>

            {/* Bio */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-4">
              {author.profile?.bio || 'این نویسنده هنوز توضیحی درباره خود ننوشته است.'}
            </p>

            {/* CTA Button */}
            <Link
              href={`/author/${author.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5"
              style={{background: 'var(--ds-brand-600)', boxShadow: '0 4px 16px -4px oklch(52% 0.14 162 / 0.4)'}}
            >
              <span>مشاهده پروفایل</span>
              <HiArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Bottom Accent */}
        <div className="h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{background: 'linear-gradient(to left, var(--ds-brand-700), var(--ds-brand-500), var(--ds-brand-100))'}} />
      </div>
    </motion.div>
  );
};

export default SingleAuthor;
