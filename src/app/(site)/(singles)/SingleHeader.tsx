import PostMeta2 from '@/components/PostMeta2/PostMeta2';
import type { PostWithRelations } from '@/types/types';
import Link from 'next/link';
import type React from 'react';
import { HiChevronLeft, HiHome } from 'react-icons/hi2';
import SingleMetaAction2 from './SingleMetaAction2';
import SingleTitle from './SingleTitle';

interface SingleHeaderProps {
  post: PostWithRelations;
  hiddenDesc?: boolean;
  titleMainClass?: string;
  className?: string;
}

const siteName = 'بازار های مالی';
const SingleHeader: React.FC<SingleHeaderProps> = ({ post, titleMainClass, className = '' }) => {
  // Calculate reading time (assuming 200 words per minute)
  const wordCount = post.content ? post.content.split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className={`nc-SingleHeader ${className} text-right rtl`}>
      {/* Glass Card Container */}
      <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-white/50 dark:border-neutral-800/50 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)]">
        {/* Decorative Gradient Background */}
        <div className="absolute inset-0 pointer-events-none" style={{background: 'linear-gradient(135deg, oklch(96% 0.03 165 / 0.4) 0%, transparent 50%, oklch(92% 0.05 165 / 0.15) 100%)'}} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{background: 'oklch(58% 0.12 165 / 0.07)'}} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{background: 'oklch(58% 0.12 165 / 0.05)'}} />

        {/* Content */}
        <div className="relative p-6 sm:p-8 lg:p-10 space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
            >
              <HiHome className="w-3.5 h-3.5" />
              <span>{siteName}</span>
            </Link>
            {post.categories.map((cat, _index) => (
              <span key={cat.id} className="flex items-center gap-2">
                <HiChevronLeft className="w-3 h-3 text-neutral-300 dark:text-neutral-600" />
                <Link
                  href={`/archive/category/${cat.slug}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                >
                  {cat.name}
                </Link>
              </span>
            ))}
          </nav>

          {/* Title */}
          <SingleTitle
            mainClass={`${titleMainClass || ''} text-2xl sm:text-3xl lg:text-3xl font-bold leading-tight tracking-tight text-neutral-900 dark:text-white`}
            title={post.title}
          />

          {/* Divider with Gradient */}
          <div className="relative h-px">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent" />
            <div className="absolute right-0 w-24 h-px" style={{background: 'linear-gradient(to left, var(--ds-brand-500), var(--ds-brand-100))'}} />
          </div>

          {/* Meta & Actions Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <PostMeta2
              size="large"
              className="leading-none"
              hiddenCategories
              meta={{
                date: post.createdAt,
                categories: post.categories,
                readingTime: readingTime,
              }}
            />
            <SingleMetaAction2 post={post} />
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div className="h-1" style={{background: 'linear-gradient(to left, var(--ds-brand-700), var(--ds-brand-500), var(--ds-brand-100))'}} />
      </div>
    </div>
  );
};

export default SingleHeader;
