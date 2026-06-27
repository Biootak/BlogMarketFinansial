import type React from 'react';
import Link from 'next/link';
import SingleTitle from './SingleTitle';
import PostMeta2 from '@/components/PostMeta2/PostMeta2';
import SingleMetaAction2 from './SingleMetaAction2';
import type { PostWithRelations } from '@/types/types';
import { HiChevronLeft, HiHome } from 'react-icons/hi2';

interface SingleHeaderProps {
  post: PostWithRelations;
  hiddenDesc?: boolean;
  titleMainClass?: string;
  className?: string;
}

const siteName = 'بازار های مالی';
const SingleHeader: React.FC<SingleHeaderProps> = ({ post, titleMainClass, className = '' }) => {
  // Calculate reading time (assuming 200 words per minute)
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div
      className={`nc-SingleHeader ${className} text-right rtl`}
    >
      {/* Glass Card Container */}
      <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-white/50 dark:border-neutral-800/50 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)]">
        {/* Decorative Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-violet-50/30 dark:from-primary-950/30 dark:via-transparent dark:to-violet-950/20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary-400/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-400/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
        
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
            {post.categories.map((cat, index) => (
              <span key={cat.id} className="flex items-center gap-2">
                <HiChevronLeft className="w-3 h-3 text-neutral-300 dark:text-neutral-600" />
                <Link 
                  href={`/category/${cat.id}`}
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
            <div className="absolute right-0 w-24 h-px bg-gradient-to-l from-primary-500 to-violet-500" />
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
        <div className="h-1 bg-gradient-to-l from-primary-500 via-violet-500 to-rose-500" />
      </div>
    </div>
  );
};

export default SingleHeader;
