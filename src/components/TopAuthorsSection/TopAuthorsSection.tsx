/**
 * @file TopAuthorsSection
 * @description Premium editorial "نویسندگان برتر" section used on the
 * home page and the archive. Replaces the old `SectionGridAuthorBox` +
 * `CardAuthorBox` pair (both deleted). Re-uses the shared
 * `<AuthorCard variant="grid">` and `<AuthorCard variant="feature">`
 * primitives so the home, hub, and profile pages all share the same
 * visual language.
 *
 * Public API kept identical for backward compatibility:
 *   props: { authors: TopAuthor[]; className?: string }
 *   so existing call sites (home, archive) do not need to change.
 */
import * as React from 'react';
import { Crown } from 'lucide-react';
import { cn, toPersianNumber } from '@/lib/utils';
import { SectionHeader } from '@/components/SectionHeader';
import AuthorCard, {
  type AuthorCardAuthor,
} from '@/components/AuthorsHub/primitives/AuthorCard';
import type { TopAuthor } from '@/actions/getTopAuthors';

export interface TopAuthorsSectionProps {
  authors: TopAuthor[];
  className?: string;
  /** Optional title override (default: "نویسندگان برتر") */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Max number of authors to display. Default = 5. */
  limit?: number;
}

const toCardAuthor = (a: TopAuthor): AuthorCardAuthor => ({
  id: a.id,
  name: a.name,
  image: a.image,
  profile: a.profile
    ? {
        avatar: a.profile.avatar,
        bio: a.profile.bio,
        jobName: a.profile.jobName,
      }
    : null,
  _count: a._count,
});

const TopAuthorsSection: React.FC<TopAuthorsSectionProps> = ({
  authors,
  className,
  title = 'نویسندگان برتر',
  subtitle,
  limit = 5,
}) => {
  const sorted = [...authors]
    .sort((a, b) => (b._count?.posts ?? 0) - (a._count?.posts ?? 0))
    .slice(0, limit);

  if (sorted.length === 0) return null;

  const [feature, ...rest] = sorted;

  return (
    <section
      dir="rtl"
      className={cn('relative', className)}
      aria-label={title}
    >
      <SectionHeader
        icon={<Crown className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.25} />}
        title={title}
        subtitle={
          subtitle ??
          `${toPersianNumber(sorted.length)} نویسنده فعال این ماه بر اساس تعداد مقالات`
        }
        accent="amber"
        viewAll={{ label: 'مشاهده همه', href: '/authors' }}
      />

      {feature && (
        <div className="mb-3 sm:mb-4 author-reveal">
          <AuthorCard
            author={toCardAuthor(feature)}
            rank={1}
            variant="feature"
          />
        </div>
      )}

      {rest.length > 0 && (
        <div
          className={cn(
            'grid gap-3 sm:gap-4',
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
            'stagger-children',
          )}
        >
          {rest.map((author, idx) => (
            <AuthorCard
              key={author.id}
              author={toCardAuthor(author)}
              rank={idx + 2 <= 3 ? idx + 2 : undefined}
              variant="grid"
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TopAuthorsSection;
