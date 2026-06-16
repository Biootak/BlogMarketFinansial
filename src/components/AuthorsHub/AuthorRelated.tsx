/**
 * @file AuthorRelated — server-rendered "سایر نویسندگان" rail.
 * Shows the next 4 active authors (excluding the current one) using
 * the shared <AuthorCard variant="compact" /> primitive.
 */
import * as React from 'react';
import { Users } from 'lucide-react';
import { cn, toPersianNumber } from '@/lib/utils';
import { SectionHeader } from '@/components/SectionHeader';
import AuthorCard, { type AuthorCardAuthor } from '@/components/AuthorsHub/primitives/AuthorCard';

export interface AuthorRelatedProps {
  authors: AuthorCardAuthor[];
  className?: string;
}

const AuthorRelated: React.FC<AuthorRelatedProps> = ({ authors, className }) => {
  if (authors.length === 0) return null;
  return (
    <section
      dir="rtl"
      className={cn('relative', className)}
      aria-label="نویسندگان مرتبط"
    >
      <SectionHeader
        icon={<Users className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.25} />}
        title="نویسندگان دیگر"
        subtitle={`${toPersianNumber(authors.length)} نویسنده فعال دیگر را ببینید.`}
        accent="primary"
        viewAll={{ label: 'مشاهده همه', href: '/authors' }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {authors.map((author) => (
          <AuthorCard key={author.id} author={author} variant="grid" />
        ))}
      </div>
    </section>
  );
};

export default AuthorRelated;
