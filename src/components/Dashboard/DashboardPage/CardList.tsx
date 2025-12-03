'use client';

import { type FC, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PostStatus } from '@prisma/client';
import { 
  HiEllipsisVertical, 
  HiPencil, 
  HiTrash, 
  HiEye, 
  HiEyeSlash,
  HiClipboard,
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
  ssr: false
});

export interface CardListProps {
  className?: string;
  post: PostWithRelations;
  ratio?: string;
  hiddenAuthor?: boolean;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: PostWithRelations['status']) => Promise<boolean>;
}

const CardList: FC<CardListProps> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = 'aspect-w-4 aspect-h-3',
  onDelete,
  onStatusChange,
}) => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { title, id, slug, createdAt, postType, authorId } = post;

  const handleDelete = useCallback(() => {
    if (window.confirm('آیا از حذف این پست اطمینان دارید؟')) {
      onDelete(id);
    }
  }, [id, onDelete]);

  const handleStatusChange = useCallback(async () => {
    let newStatus: PostWithRelations['status'] = 'DRAFT';
    let confirmMessage: string;
    
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
      if (post.status === 'PUBLISHED') {
        newStatus = 'PENDING_REVIEW';
        confirmMessage = 'آیا از تغییر وضعیت پست به "در انتظار بررسی" اطمینان دارید؟';
      } else if (post.status === 'PENDING_REVIEW') {
        newStatus = 'PUBLISHED';
        confirmMessage = 'آیا از انتشار این پست اطمینان دارید؟';
      } else {
        newStatus = 'PUBLISHED';
        confirmMessage = 'آیا از انتشار این پیش‌نویس اطمینان دارید؟';
      }
    } else {
      if (post.status === 'PUBLISHED') {
        newStatus = 'DRAFT' as PostWithRelations['status'];
        confirmMessage = 'آیا از تبدیل پست به پیش‌نویس اطمینان دارید؟';
      } else if (post.status === 'DRAFT') {
        newStatus = 'PENDING_REVIEW' as PostWithRelations['status'];
        confirmMessage = 'آیا از ارسال پیش‌نویس برای بررسی اطمینان دارید؟';
      } else {
        newStatus = 'DRAFT' as PostWithRelations['status'];
        confirmMessage = 'آیا از برگرداندن پست به پیش‌نویس اطمینان دارید؟';
      }
    }

    if (window.confirm(confirmMessage)) {
      const success = await onStatusChange(post.id, newStatus as PostStatus);
      if (success) {
        toast({
          variant: 'success',
          title: 'موفقیت‌آمیز',
          description: 'وضعیت پست با موفقیت تغییر کرد.',
        });
      }
    }
  }, [post.id, post.status, onStatusChange, session?.user?.role, toast]);

  const postMeta = useMemo(() => <PostCardMeta meta={post} />, [post]);

  // نشون دادن دکمه منو حتی وقتی session در حال لود شدنه (در داشبورد کاربر حتماً لاگین کرده)
  const isSessionLoading = status === 'loading';
  const canEditPost = isSessionLoading || 
                     session?.user?.role === 'SUPER_ADMIN' || 
                     session?.user?.role === 'ADMIN' || 
                     (session?.user?.role === 'AUTHOR' && session?.user?.id === authorId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn('group relative', className)}
    >
      {/* Card Container */}
      <div 
        className="relative flex flex-col h-full rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition-all duration-500"
        style={{
          boxShadow: `
            0 0 0 1px rgba(0,0,0,0.03),
            0 2px 4px rgba(0,0,0,0.02),
            0 8px 16px rgba(0,0,0,0.04),
            0 16px 32px rgba(0,0,0,0.04)
          `,
        }}
      >
        {/* Hover glow effect */}
        <div 
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.08), transparent 70%)',
          }}
        />

        {/* Image Section */}
        <div className={cn('relative flex-shrink-0 w-full overflow-hidden', ratio)}>
          <PostFeaturedMedia post={post} />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Status Badge */}
          <div className="absolute top-4 right-4 z-10">
            <PostStatusBadge status={post.status} />
          </div>

          {/* Actions Menu */}
          {canEditPost && (
            <div className="absolute top-4 left-4 z-20">
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger
                  className="focus:outline-none"
                  aria-label="گزینه‌های بیشتر"
                >
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    <HiEllipsisVertical className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl">
                  {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || post.authorId === session?.user?.id) && (
                    <>
                      <DropdownMenuItem 
                        onClick={handleStatusChange}
                        className="rounded-lg cursor-pointer"
                      >
                        {post.status === 'PUBLISHED' ? (
                          <>
                            <HiEyeSlash className="ml-2 w-4 h-4" />
                            {session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' 
                              ? 'در انتظار بررسی' 
                              : 'پیش‌نویس کردن'}
                          </>
                        ) : post.status === 'DRAFT' ? (
                          <>
                            <HiClipboard className="ml-2 w-4 h-4" />
                            ارسال برای بررسی
                          </>
                        ) : (
                          <>
                            {session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' ? (
                              <>
                                <HiEye className="ml-2 w-4 h-4" />
                                انتشار
                              </>
                            ) : (
                              <>
                                <HiPencil className="ml-2 w-4 h-4" />
                                برگشت به پیش‌نویس
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                        <Link href={`/dashboard/posts/edit/${post.id}`}>
                          <HiPencil className="ml-2 w-4 h-4" />
                          ویرایش
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-900/20"
                      >
                        <HiTrash className="ml-2 w-4 h-4" />
                        حذف
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="relative p-5 flex flex-col flex-grow">
          {/* Meta info */}
          {!hiddenAuthor ? (
            postMeta
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <FormattedDate date={createdAt} />
            </span>
          )}
          
          {/* Title */}
          <h3 className="mt-3 mb-4 text-base font-bold text-slate-900 dark:text-white leading-relaxed group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
            <Link 
              href={getPostLink(postType, slug)} 
              className="line-clamp-2 relative z-10 hover:underline" 
              title={title}
            >
              {title}
            </Link>
          </h3>
          
          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
            <BookmarkCheck post={post}>
              {(isBookmarked) => (
                <PostCardSaveAction
                  className="relative z-10"
                  postId={post.id}
                  initialBookmarked={isBookmarked}
                  bookmarkClass="h-9 w-9 rounded-xl bg-slate-50 hover:bg-violet-50 dark:bg-slate-800 dark:hover:bg-violet-900/30 transition-colors duration-200"
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
