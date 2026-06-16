/**
 * @file AuthorCard
 * @description Premium editorial author card. Replaces the previous
 * CardAuthorBox (grid) and CardAuthorBox2 (slider) — both shared the same
 * responsibilities but diverged. This single component covers the grid,
 * slider, hub, and profile-preview use cases via a `variant` prop.
 *
 * Server-renderable. No client JS. Uses <AuthorAvatar> for the avatar
 * and the project's existing tokens for typography / spacing.
 */
import * as React from 'react';
import Link from 'next/link';
import { ArrowUpLeft, FileText, Sparkles, Crown } from 'lucide-react';
import { cn, toPersianNumber } from '@/lib/utils';
import AuthorAvatar, { type AuthorAvatarSize } from './AuthorAvatar';

export type AuthorCardVariant = 'grid' | 'feature' | 'compact';

export interface AuthorCardAuthor {
  id: string;
  name: string | null;
  image?: string | null;
  profile?: {
    avatar?: string | null;
    bio?: string | null;
    jobName?: string | null;
  } | null;
  _count?: { posts?: number };
  /** optional expertise tag shown on the feature variant */
  expertise?: string | null;
}

export interface AuthorCardProps {
  author: AuthorCardAuthor;
  /** 1-based rank, used to show a medal (gold/silver/bronze) on top 3 */
  rank?: number;
  variant?: AuthorCardVariant;
  className?: string;
  /** Avatar size override (defaults depend on the variant) */
  avatarSize?: AuthorAvatarSize;
}

const AVATAR_SIZE_BY_VARIANT: Record<AuthorCardVariant, AuthorAvatarSize> = {
  grid: 'lg',
  feature: '2xl',
  compact: 'sm',
};

const RANK_BG: Record<number, string> = {
  1: 'from-amber-300 via-amber-400 to-amber-600 text-amber-950',
  2: 'from-neutral-200 via-neutral-300 to-neutral-500 text-neutral-900',
  3: 'from-orange-300 via-orange-500 to-orange-700 text-orange-50',
};

const AuthorCard = React.forwardRef<HTMLAnchorElement, AuthorCardProps>(
  function AuthorCard(
    { author, rank, variant = 'grid', className, avatarSize },
    ref,
  ) {
    const { id, name, profile, _count, expertise } = author;
    const postCount = _count?.posts ?? 0;
    const job = profile?.jobName ?? 'نویسنده';
    const bio = profile?.bio ?? '';
    const displayName = name?.trim() || 'نویسنده';
    const avatar = profile?.avatar ?? author.image ?? null;
    const avatarSizeFinal = avatarSize ?? AVATAR_SIZE_BY_VARIANT[variant];
    const href = `/author/${id}`;

    if (variant === 'compact') {
      return (
        <Link
          ref={ref}
          href={href}
          className={cn(
            'group inline-flex items-center gap-2.5 rounded-full pe-3 ps-1 py-1',
            'bg-white/60 dark:bg-neutral-900/40 border border-[color:var(--hairline)]',
            'hover:border-primary-300 dark:hover:border-primary-700',
            'transition-colors duration-200',
            className,
          )}
          aria-label={`مشاهده پروفایل ${displayName}`}
        >
          <AuthorAvatar
            size={avatarSizeFinal}
            imgUrl={avatar}
            userName={displayName}
          />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">
            {displayName}
          </span>
        </Link>
      );
    }

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          'group relative block focus:outline-none',
          'rounded-2xl sm:rounded-3xl author-surface author-lift',
          'p-4 sm:p-5 lg:p-6',
          'author-conic-border',
          variant === 'feature' &&
            'p-5 sm:p-6 lg:p-8 bg-gradient-to-br from-white via-white to-primary-50/60 dark:from-neutral-900 dark:via-neutral-900 dark:to-primary-900/10',
          className,
        )}
        aria-label={`مشاهده پروفایل ${displayName}`}
      >
        {rank && rank >= 1 && rank <= 3 && (
          <span
            className={cn(
              'absolute top-3 end-3 z-10 inline-flex items-center justify-center',
              'h-7 w-7 sm:h-8 sm:w-8 rounded-full text-xs font-black',
              'bg-gradient-to-br shadow-md',
              RANK_BG[rank],
            )}
            aria-label={`رتبه ${toPersianNumber(rank)}`}
          >
            {rank === 1 ? (
              <Crown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            ) : (
              toPersianNumber(rank)
            )}
          </span>
        )}

        <div
          className={cn(
            'flex flex-col items-center text-center',
            variant === 'feature' && 'sm:flex-row sm:text-start sm:items-center sm:gap-5',
          )}
        >
          <AuthorAvatar
            size={avatarSizeFinal}
            imgUrl={avatar}
            userName={displayName}
            halo={variant === 'feature'}
            ringClassName="ring-[3px] ring-white/80 dark:ring-neutral-900/80"
          />

          <div
            className={cn(
              'mt-3 w-full min-w-0',
              variant === 'feature' && 'sm:mt-0 sm:flex-1',
            )}
          >
            <h3
              className={cn(
                'font-bold tracking-tight text-neutral-900 dark:text-neutral-50',
                'truncate group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors',
                variant === 'feature'
                  ? 'text-lg sm:text-xl'
                  : 'text-sm sm:text-[15px]',
              )}
            >
              {displayName}
            </h3>
            <p
              className={cn(
                'mt-0.5 truncate text-neutral-500 dark:text-neutral-400',
                variant === 'feature' ? 'text-sm' : 'text-[12px]',
              )}
            >
              {job}
            </p>

            {variant === 'feature' && bio && (
              <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                {bio}
              </p>
            )}

            {variant === 'feature' && expertise && (
              <span className="author-chip mt-3">
                <Sparkles className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                {expertise}
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            'mt-4 sm:mt-5 flex items-center justify-between gap-3',
            variant === 'feature' && 'sm:mt-5',
          )}
        >
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full',
              'bg-neutral-100/80 dark:bg-neutral-800/70',
              'text-neutral-700 dark:text-neutral-200',
              'px-2.5 py-1 text-[11.5px] font-medium',
              'group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30',
              'group-hover:text-primary-700 dark:group-hover:text-primary-200',
              'transition-colors duration-200',
            )}
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            <span className="author-num">{toPersianNumber(postCount)}</span>
            <span>مقاله</span>
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11.5px] font-semibold',
              'text-primary-600 dark:text-primary-300',
              'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0',
              'transition-all duration-300',
            )}
          >
            مشاهده پروفایل
            <ArrowUpLeft
              className="h-3.5 w-3.5 rtl:rotate-0"
              strokeWidth={2.5}
              aria-hidden
            />
          </span>
        </div>
      </Link>
    );
  },
);

export default AuthorCard;
