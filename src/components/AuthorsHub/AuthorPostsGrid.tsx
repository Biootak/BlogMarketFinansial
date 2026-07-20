import Card11 from '@/components/Card11/Card11';
import Empty from '@/components/Empty';
import { cn, toPersianNumber } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import { FileText } from 'lucide-react';
/**
 * @file AuthorPostsGrid
 * @description Premium editorial grid of an author's published posts.
 * Server-renderable. Uses the existing Card11 for visual consistency
 * with the rest of the site.
 */
import type * as React from 'react';

export interface AuthorPostsGridProps {
  posts: PostWithRelations[];
  className?: string;
}

const AuthorPostsGrid: React.FC<AuthorPostsGridProps> = ({ posts, className }) => {
  return (
    <section dir="rtl" className={cn('relative', className)} aria-label="مقالات نویسنده">
      <header className="mb-4 sm:mb-5 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[color:var(--hairline)] bg-primary-500/10 text-primary-500 dark:text-primary-300"
        >
          <FileText className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            مقالات
          </h2>
          <p className="mt-0.5 text-[11.5px] sm:text-[13px] text-neutral-500 dark:text-neutral-400">
            {toPersianNumber(posts.length)} مقاله از این نویسنده
          </p>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="author-surface rounded-2xl p-6 sm:p-10">
          <Empty />
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6',
            'stagger-children',
          )}
        >
          {posts.map((post) => (
            <Card11 key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
};

export default AuthorPostsGrid;
