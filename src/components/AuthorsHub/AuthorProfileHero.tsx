/**
 * @file AuthorProfileHero
 * @description Premium editorial hero for a single author profile page.
 * Server-renderable. Replaces the old /author/[id]/Author/AuthorProfile
 * component with a more refined visual hierarchy.
 */
import * as React from 'react';
import Image from 'next/image';
import { Briefcase, Building2, FileText, MapPin } from 'lucide-react';
import { cn, toPersianNumber } from '@/lib/utils';
import AuthorAvatar from '@/components/AuthorsHub/primitives/AuthorAvatar';

export interface AuthorProfileHeroAuthor {
  id: string;
  name: string | null;
  email?: string | null;
  profile?: {
    avatar?: string | null;
    bgImage?: string | null;
    bio?: string | null;
    jobName?: string | null;
    company?: string | null;
  } | null;
  _count?: { posts?: number };
  createdAt?: Date | string;
}

export interface AuthorProfileHeroProps {
  author: AuthorProfileHeroAuthor;
  className?: string;
}

const FALLBACK_BG = '/images/placeholder-large-h.png';

const AuthorProfileHero: React.FC<AuthorProfileHeroProps> = ({
  author,
  className,
}) => {
  const name = author.name?.trim() || 'نویسنده';
  const job = author.profile?.jobName;
  const company = author.profile?.company;
  const bio = author.profile?.bio;
  const avatar = author.profile?.avatar ?? null;
  const bgImage = author.profile?.bgImage || FALLBACK_BG;
  const postCount = author._count?.posts ?? 0;

  return (
    <section
      dir="rtl"
      className={cn(
        'relative overflow-hidden',
        'rounded-3xl sm:rounded-[2.5rem]',
        'border border-[color:var(--hairline)]',
        'bg-white/70 dark:bg-neutral-900/60 backdrop-blur-sm',
        className,
      )}
      aria-label={`پروفایل ${name}`}
    >
      {/* Cover */}
      <div className="relative h-44 sm:h-60 lg:h-72 overflow-hidden">
        <Image
          src={bgImage}
          alt={`تصویر پس‌زمینه ${name}`}
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
          className="object-cover"
        />
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(20,23,32,0.55) 100%)',
          }}
        />
      </div>

      {/* Identity */}
      <div className="relative px-5 sm:px-8 lg:px-10 pb-6 sm:pb-8 lg:pb-10 -mt-14 sm:-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <div className="shrink-0">
            <AuthorAvatar
              size="2xl"
              imgUrl={avatar}
              userName={name}
              halo
              containerClassName="rounded-full"
            />
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-start">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 text-balance">
              {name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
              {job && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  {job}
                </span>
              )}
              {company && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  {company}
                </span>
              )}
            </div>

            {bio && (
              <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-200 max-w-2xl mx-auto sm:mx-0 text-balance">
                {bio}
              </p>
            )}
          </div>

          <div className="shrink-0 self-center sm:self-end">
            <div
              className={cn(
                'inline-flex flex-col items-center gap-0.5 rounded-2xl',
                'bg-white/80 dark:bg-neutral-900/70 backdrop-blur-sm',
                'border border-[color:var(--hairline)]',
                'px-4 py-3',
              )}
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                <FileText className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                مقالات منتشر شده
              </span>
              <span className="author-num text-2xl font-black text-neutral-900 dark:text-neutral-50">
                {toPersianNumber(postCount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthorProfileHero;
