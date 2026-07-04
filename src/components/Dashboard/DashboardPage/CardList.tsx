'use client';

import { type FC, useCallback, useMemo } from 'react';
import { motion } from '@/lib/motion-shim';
import {
  HiCheck,
} from 'react-icons/hi2';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import type { PostWithRelations } from '@/types/types';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostStatusBadge from '../Blog/PostStatusBadge';
import { cn } from '@/lib/utils';

import BookmarkCheck from '../../BookmarkCheck';
import FormattedDate from '@/components/FormattedDate';
import { getPostLink } from '@/lib/getPostLink';
import dynamic from 'next/dynamic';

const PostFeaturedMedia = dynamic(() => import('@/components/PostFeaturedMedia/PostFeaturedMedia'), {
  ssr: false,
});

export interface CardListProps {
  className?: string;
  post: PostWithRelations;
  ratio?: string;
  hiddenAuthor?: boolean;
  onActivate?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
  isSelecting?: boolean;
  isActive?: boolean;
}

/**
 * کارت پست — الهام گرفته از `at-tile` atelier style (hairline، emerald-first).
 *
 * Design choices:
 *   - container: `at-tile` (hairline border + ملایم shadow + radius-lg)
 *   - aspect ratio تصویر 4:3، `overflow-hidden` (همون at-tile)
 *   - status badge absolute بالا چپ
 *   - footer مثل at-posts__row (hairline separator + small icons)
 *   - active state: border emerald + ملایم glow (var(--at-accent))
 *   - selection state: border violet (var(--at-violet)) با checkmark badge
 *
 * Interactive logic:
 *   - کلیک روی فضای خالی کارت (نه لینک/دکمه) → activate
 *   - کلیک روی عنوان = navigation به blog post
 *   - کلیک روی bookmark/like/comment = همون کار خودشون (skip activate)
 *   - در حالت selecting: کلیک = toggle selection
 */
const CardList: FC<CardListProps> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = 'aspect-w-4 aspect-h-3',
  onActivate,
  selected = false,
  onSelect,
  isSelecting = false,
  isActive = false,
}) => {
  const { data: session, status } = useSession();
  const { title, id, slug, createdAt, postType, authorId } = post;

  const postMeta = useMemo(() => <PostCardMeta meta={post} />, [post]);

  const isSessionLoading = status === 'loading';
  const canEditPost =
    isSessionLoading ||
    session?.user?.role === 'OWNER' ||
    session?.user?.role === 'ADMIN' ||
    (session?.user?.role === 'AUTHOR' && session?.user?.id === authorId);

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // فقط المان‌های interactive داخلی (نه خود container) رو skip می‌کنیم.
      // چون خود container با role="button" هست، اگه از closest استفاده کنیم
      // خودش رو پیدا می‌کنه و همیشه return میشه.
      const target = e.target as HTMLElement;
      let el: HTMLElement | null = target;
      while (el && el !== e.currentTarget) {
        const tag = el.tagName;
        if (
          tag === 'A' ||
          tag === 'BUTTON' ||
          tag === 'INPUT' ||
          tag === 'LABEL' ||
          el.getAttribute('role') === 'button' ||
          el.getAttribute('role') === 'link'
        ) {
          return;
        }
        el = el.parentElement;
      }

      if (isSelecting) {
        onSelect?.(id);
      } else {
        onActivate?.(id);
      }
    },
    [isSelecting, onSelect, onActivate, id],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isSelecting ? undefined : { y: -2 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative', className)}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === ' ' && !isSelecting) {
          e.preventDefault();
          onActivate?.(id);
        }
        if ((e.key === ' ' || e.key === 'Enter') && isSelecting) {
          e.preventDefault();
          onSelect?.(id);
        }
      }}
      aria-pressed={isActive}
      aria-label={
        isSelecting
          ? `${selected ? 'لغو انتخاب' : 'انتخاب'} ${title}`
          : `${isActive ? 'لغو فعال‌سازی' : 'فعال‌سازی'} ${title}`
      }
    >
      {/* ── Container — at-tile with state variants ── */}
      <div
        className={cn(
          'at-tile relative flex flex-col h-full cursor-pointer transition-all duration-200',
          'ease-[cubic-bezier(0.22,1,0.36,1)]',
          // active state: emerald accent
          isActive &&
            !isSelecting &&
            cn(
              'border-[color:var(--at-accent)]',
              'shadow-[0_0_0_1px_var(--at-accent),var(--at-shadow-hover)]',
            ),
          // selection state: violet
          isSelecting && selected && 'border-[color:var(--at-violet)]',
        )}
      >
        {/* ── Image Section ── */}
        <div className={cn('relative flex-shrink-0 w-full overflow-hidden', ratio)}>
          <PostFeaturedMedia post={post} />

          {/* subtle gradient overlay (atelier hover) */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"
            aria-hidden
          />

          {/* Status Badge — top-end */}
          <div className="absolute top-3 end-3 z-10">
            <PostStatusBadge status={post.status} />
          </div>

          {/* Selection checkbox — top-start (فقط در selection mode) */}
          {isSelecting && (
            <div className="absolute top-3 start-3 z-10">
              <div
                className={cn(
                  'w-6 h-6 rounded-[8px] border-2 flex items-center justify-center transition-all duration-200',
                  selected
                    ? 'bg-[color:var(--at-violet)] border-[color:var(--at-violet)] text-white'
                    : 'bg-white/90 dark:bg-slate-900/90 border-[color:var(--at-line-strong)]',
                )}
              >
                {selected && <HiCheck className="w-4 h-4" />}
              </div>
            </div>
          )}
        </div>

        {/* ── Content Section ── */}
        <div className="relative flex flex-col flex-grow px-4 pt-3 pb-4">
          {/* Meta info */}
          {!hiddenAuthor ? (
            postMeta
          ) : (
            <span className="text-xs text-[color:var(--at-fg-subtle)]">
              <FormattedDate date={createdAt} />
            </span>
          )}

          {/* Title — like at-posts__feature-title */}
          <h3 className="mt-2 mb-3 text-sm font-bold text-[color:var(--at-fg)] leading-relaxed line-clamp-2" dir="rtl">
            <Link
              href={getPostLink(postType, slug)}
              className={cn(
                'relative z-10 transition-colors duration-200',
                'hover:text-[color:var(--at-accent)]',
              )}
              title={title}
              onClick={(e) => isSelecting && e.preventDefault()}
              tabIndex={isSelecting ? -1 : 0}
            >
              {title}
            </Link>
          </h3>

          {/* Footer Actions — like at-posts__row */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-[color:var(--at-line)]">
            <BookmarkCheck post={post}>
              {(isBookmarked) => (
                <PostCardSaveAction
                  className="relative z-10"
                  postId={post.id}
                  initialBookmarked={isBookmarked}
                  bookmarkClass={cn(
                    'h-8 w-8 rounded-[8px]',
                    'bg-[color:var(--at-bg-elevated)]',
                    'hover:bg-[color:var(--at-accent-soft)] hover:text-[color:var(--at-accent)]',
                    'transition-colors duration-200 text-[color:var(--at-fg-muted)]',
                  )}
                />
              )}
            </BookmarkCheck>
            <PostCardLikeAndComment className="relative z-10" post={post} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CardList;
