'use client';

import { type FC, useCallback, useMemo } from 'react';
import { motion } from '@/lib/motion-shim';
import type { PostStatus } from '@prisma/client';
import {
  HiEllipsisVertical,
  HiPencil,
  HiTrash,
  HiEye,
  HiEyeSlash,
  HiClipboard,
  HiCheck,
} from 'react-icons/hi2';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import type { PostWithRelations } from '@/types/types';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostStatusBadge from '../Blog/PostStatusBadge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: PostWithRelations['status']) => Promise<boolean>;
  selected?: boolean;
  onSelect?: (id: string) => void;
  isSelecting?: boolean;
}

const CardList: FC<CardListProps> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = 'aspect-w-4 aspect-h-3',
  onDelete,
  onStatusChange,
  selected = false,
  onSelect,
  isSelecting = false,
}) => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { title, id, slug, createdAt, postType, authorId } = post;

  const handleDelete = useCallback(() => {
    onDelete(id);
  }, [id, onDelete]);

  const handleStatusChange = useCallback(async () => {
    let newStatus: PostWithRelations['status'] = 'DRAFT';

    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER') {
      if (post.status === 'PUBLISHED') {
        newStatus = 'PENDING_REVIEW';
      } else {
        newStatus = 'PUBLISHED';
      }
    } else {
      if (post.status === 'DRAFT') {
        newStatus = 'PENDING_REVIEW';
      } else {
        newStatus = 'DRAFT';
      }
    }

    const success = await onStatusChange(post.id, newStatus as PostStatus);
    if (success) {
      toast({
        variant: 'success',
        title: 'موفقیتآمیز',
        description: 'وضعیت پست با موفقیت تغییر کرد.',
      });
    }
  }, [post.id, post.status, onStatusChange, session?.user?.role, toast]);

  const postMeta = useMemo(() => <PostCardMeta meta={post} />, [post]);

  const isSessionLoading = status === 'loading';
  const canEditPost =
    isSessionLoading ||
    session?.user?.role === 'OWNER' ||
    session?.user?.role === 'ADMIN' ||
    (session?.user?.role === 'AUTHOR' && session?.user?.id === authorId);

  const handleCardClick = useCallback(() => {
    if (isSelecting && onSelect) {
      onSelect(id);
    }
  }, [isSelecting, onSelect, id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isSelecting ? undefined : { y: -6, scale: 1.01 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('group relative', className)}
      onClick={handleCardClick}
      role={isSelecting ? 'button' : undefined}
      tabIndex={isSelecting ? 0 : undefined}
      onKeyDown={
        isSelecting
          ? (e: React.KeyboardEvent) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onSelect?.(id);
              }
            }
          : undefined
      }
      aria-label={isSelecting ? `${selected ? 'لغو انتخاب' : 'انتخاب'} ${title}` : undefined}
    >
      {/* Card Container */}
      <div
        className={cn(
          'dash-panel relative flex flex-col h-full overflow-hidden transition-all duration-300',
          isSelecting && 'cursor-pointer',
          isSelecting && selected && 'ring-2 ring-violet-500 dark:ring-violet-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
        )}
      >
        {/* Hover glow effect */}
        <div
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.08), transparent 70%)',
          }}
        />

        {/* Selection checkbox overlay */}
        {isSelecting && (
          <div className="absolute top-3 left-3 z-30">
            <div
              className={cn(
                'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200',
                selected
                  ? 'bg-violet-500 border-violet-500 text-white'
                  : 'bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-600',
              )}
            >
              {selected && <HiCheck className="w-4 h-4" />}
            </div>
          </div>
        )}

        {/* Image Section */}
        <div className={cn('relative flex-shrink-0 w-full overflow-hidden', ratio)}>
          <PostFeaturedMedia post={post} />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status Badge */}
          <div className="absolute top-3 right-3 z-10">
            <PostStatusBadge status={post.status} />
          </div>

          {/* Actions Menu */}
          {canEditPost && !isSelecting && (
            <div className="absolute top-3 left-3 z-20">
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger
                  className="focus:outline-none"
                  aria-label="گزینههای بیشتر"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    <HiEllipsisVertical className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl w-48">
                  {/* Status change */}
                  {(session?.user?.role === 'ADMIN' ||
                    session?.user?.role === 'OWNER' ||
                    post.authorId === session?.user?.id) && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange();
                        }}
                        className="rounded-lg cursor-pointer gap-2"
                      >
                        {post.status === 'PUBLISHED' ? (
                          <>
                            <HiEyeSlash className="w-4 h-4" />
                            {session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'
                              ? 'تغییر به در انتظار بررسی'
                              : 'پیشنویس کردن'}
                          </>
                        ) : post.status === 'DRAFT' ? (
                          <>
                            <HiClipboard className="w-4 h-4" />
                            ارسال برای بررسی
                          </>
                        ) : (
                          <>
                            {session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER' ? (
                              <>
                                <HiEye className="w-4 h-4" />
                                انتشار
                              </>
                            ) : (
                              <>
                                <HiPencil className="w-4 h-4" />
                                برگشت به پیشنویس
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuItem>

                      {/* Edit */}
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2">
                        <Link
                          href={`/dashboard/posts/edit/${post.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <HiPencil className="w-4 h-4" />
                          ویرایش
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {/* Delete */}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                        className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg cursor-pointer gap-2 focus:bg-rose-50 dark:focus:bg-rose-900/20"
                      >
                        <HiTrash className="w-4 h-4" />
                        حذف پست
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="relative p-4 flex flex-col flex-grow">
          {/* Meta info */}
          {!hiddenAuthor ? (
            postMeta
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <FormattedDate date={createdAt} />
            </span>
          )}

          {/* Title */}
          <h3 className="mt-2.5 mb-3 text-sm font-bold text-slate-900 dark:text-white leading-relaxed group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
            <Link
              href={getPostLink(postType, slug)}
              className="line-clamp-2 relative z-10 hover:underline"
              title={title}
              onClick={(e) => isSelecting && e.preventDefault()}
              tabIndex={isSelecting ? -1 : undefined}
            >
              {title}
            </Link>
          </h3>

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
            <BookmarkCheck post={post}>
              {(isBookmarked) => (
                <PostCardSaveAction
                  className="relative z-10"
                  postId={post.id}
                  initialBookmarked={isBookmarked}
                  bookmarkClass="h-8 w-8 rounded-lg bg-slate-50 hover:bg-violet-50 dark:bg-slate-800 dark:hover:bg-violet-900/30 transition-colors duration-200"
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
