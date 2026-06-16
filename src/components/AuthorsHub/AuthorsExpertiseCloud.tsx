/**
 * @file AuthorsExpertiseCloud
 * @description A premium "expertise" section for the author hub. Renders
 * up to 8 author chips per category. Server component.
 */
import * as React from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { cn, toPersianNumber } from '@/lib/utils';
import { SectionHeader } from '@/components/SectionHeader';
import AuthorAvatar from './primitives/AuthorAvatar';

export interface ExpertiseGroup {
  /** category id (used as key) */
  id: string;
  name: string;
  slug: string;
  authors: Array<{
    id: string;
    name: string | null;
    profile?: { avatar?: string | null; jobName?: string | null } | null;
  }>;
}

export interface AuthorsExpertiseCloudProps {
  groups: ExpertiseGroup[];
  className?: string;
}

const AuthorsExpertiseCloud: React.FC<AuthorsExpertiseCloudProps> = ({
  groups,
  className,
}) => {
  if (groups.length === 0) return null;
  return (
    <section
      dir="rtl"
      className={cn('relative', className)}
      aria-label="نویسندگان بر اساس تخصص"
    >
      <SectionHeader
        icon={<BookOpen className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.25} />}
        title="تخصص‌ها"
        subtitle="نویسندگان را بر اساس حوزه تخصص‌شان کاوش کنید."
        accent="primary"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {groups.map((group) => (
          <article
            key={group.id}
            className={cn(
              'relative rounded-2xl author-surface author-lift',
              'p-4 sm:p-5',
            )}
          >
            <header className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm sm:text-[15px] font-bold text-neutral-900 dark:text-neutral-50 line-clamp-1">
                {group.name}
              </h3>
              <Link
                href={`/archive/category/${group.slug}`}
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 dark:text-primary-300 hover:gap-1.5 transition-all"
              >
                <span>مشاهده مقالات</span>
                <ChevronLeft className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              </Link>
            </header>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {group.authors.slice(0, 8).map((author) => (
                <Link
                  key={author.id}
                  href={`/author/${author.id}`}
                  className={cn(
                    'group/chip inline-flex items-center gap-2 pe-3 ps-1 py-1 rounded-full',
                    'bg-white/60 dark:bg-neutral-900/40',
                    'border border-[color:var(--hairline)]',
                    'hover:border-primary-300 dark:hover:border-primary-700',
                    'transition-colors duration-200',
                  )}
                  aria-label={`مشاهده پروفایل ${author.name ?? ''}`}
                >
                  <AuthorAvatar
                    size="xs"
                    imgUrl={author.profile?.avatar ?? null}
                    userName={author.name}
                  />
                  <span className="text-[11px] sm:text-[12px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover/chip:text-primary-600 dark:group-hover/chip:text-primary-300 transition-colors line-clamp-1">
                    {author.name}
                  </span>
                </Link>
              ))}
              {group.authors.length > 8 && (
                <span
                  className="text-[11px] text-neutral-500 dark:text-neutral-400"
                  aria-label={`${toPersianNumber(group.authors.length - 8)} نویسنده دیگر`}
                >
                  +{toPersianNumber(group.authors.length - 8)}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AuthorsExpertiseCloud;
