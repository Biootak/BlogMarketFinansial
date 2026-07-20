import { SectionHeader } from '@/components/SectionHeader';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';
/**
 * @file AuthorsGrid
 * @description Premium editorial grid for the author hub. Renders the
 * remaining authors after the top 3 are surfaced in the hero. Pure
 * server component.
 */
import type * as React from 'react';
import AuthorCard, { type AuthorCardAuthor } from './primitives/AuthorCard';

export interface AuthorsGridProps {
  authors: AuthorCardAuthor[];
  className?: string;
  /** number of authors already featured above the grid (skip from rank) */
  featuredCount?: number;
}

const AuthorsGrid: React.FC<AuthorsGridProps> = ({ authors, className, featuredCount = 0 }) => {
  if (authors.length === 0) return null;
  return (
    <section dir="rtl" className={cn('relative', className)} aria-label="نویسندگان فعال">
      <SectionHeader
        icon={<Crown className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.25} />}
        title="نویسندگان فعال"
        subtitle={`${authors.length} نویسنده‌ای که در یک ماه گذشته بیشترین مقالات را منتشر کرده‌اند.`}
        accent="amber"
        viewAll={undefined}
      />
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4',
          'stagger-children',
        )}
      >
        {authors.map((author, i) => (
          <AuthorCard
            key={author.id}
            author={author}
            rank={i + 1 + featuredCount <= 3 ? i + 1 + featuredCount : undefined}
            variant="grid"
          />
        ))}
      </div>
    </section>
  );
};

export default AuthorsGrid;
