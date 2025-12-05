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
  HiDocumentDuplicate,
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
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('group relative', className)}
    >
      {/* Card Container */}
      <div 
        className="relative flex flex-col h-full rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 transition-all duration-200"
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
          className="absolute inset-0 rounded-xl sm:rounded-2xl lg:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ 
            background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.1), transparent 70%)',
          }}
        />
        
        {/* Shimmer effect on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl"
        >
          <div 
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        </div>

        {/* Image Section */}
        <div className={cn('relative flex-shrink-0 w-full overflow-hidden', ratio)}>
          <PostFeaturedMedia post={post} />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Bottom fade for better text readability */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
          
          {/* Top Bar with Status and Actions */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 sm:p-2.5 md:p-3 z-10">
            {/* Status Badge */}
            <div>
              <PostStatusBadge status={post.status} />
            </div>

            {/* Actions Menu */}
            {canEditPost && (
              <div>
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger
                  className="focus:outline-none"
                  aria-label="گزینه‌های بیشتر"
                >
                  <motion.div 
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md flex items-center justify-center shadow-lg border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-200"
                  >
                    <HiEllipsisVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-700 dark:text-slate-300" />
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl min-w-[160px] sm:min-w-[180px]">
                  {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || post.authorId === session?.user?.id) && (
                    <>
                      <DropdownMenuItem 
                        onClick={handleStatusChange}
                        className="rounded-lg cursor-pointer text-xs sm:text-sm"
                      >
                        {post.status === 'PUBLISHED' ? (
                          <>
                            <HiEyeSlash className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="truncate">
                              {session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' 
                                ? 'در انتظار بررسی' 
                                : 'پیش‌نویس کردن'}
                            </span>
                          </>
                        ) : post.status === 'DRAFT' ? (
                          <>
                            <HiClipboard className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="truncate">ارسال برای بررسی</span>
                          </>
                        ) : (
                          <>
                            {session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' ? (
                              <>
                                <HiEye className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="truncate">انتشار</span>
                              </>
                            ) : (
                              <>
                                <HiPencil className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="truncate">برگشت به پیش‌نویس</span>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-xs sm:text-sm">
                        <Link href={`/dashboard/posts/edit/${post.id}`}>
                          <HiPencil className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="truncate">ویرایش</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-900/20 text-xs sm:text-sm"
                      >
                        <HiTrash className="ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="truncate">حذف</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            )}
          </div>
          
          {/* Quick Actions Overlay - Shows on Hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
              {/* View Post Button */}
              <motion.div
                initial={{ scale: 0, y: 20 }}
                whileInView={{ scale: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Link
                  href={getPostLink(postType, slug)}
                  className="group/btn relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl border border-white/50 dark:border-slate-700/50 hover:scale-110 active:scale-95 transition-all duration-200"
                  title="مشاهده پست"
                >
                  <HiEye className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  {/* Tooltip */}
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[10px] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                    مشاهده
                  </span>
                </Link>
              </motion.div>
              
              {/* Edit Post Button */}
              {canEditPost && (
                <motion.div
                  initial={{ scale: 0, y: 20 }}
                  whileInView={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Link
                    href={`/dashboard/posts/edit/${post.id}`}
                    className="group/btn relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl border border-white/50 dark:border-slate-700/50 hover:scale-110 active:scale-95 transition-all duration-200"
                    title="ویرایش پست"
                  >
                    <HiPencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    {/* Tooltip */}
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[10px] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                      ویرایش
                    </span>
                  </Link>
                </motion.div>
              )}
              
              {/* Copy Link Button */}
              <motion.div
                initial={{ scale: 0, y: 20 }}
                whileInView={{ scale: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + getPostLink(postType, slug));
                    toast({
                      title: 'کپی شد!',
                      description: 'لینک پست در کلیپ‌بورد کپی شد.',
                      variant: 'success',
                    });
                  }}
                  className="group/btn relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl border border-white/50 dark:border-slate-700/50 hover:scale-110 active:scale-95 transition-all duration-200"
                  title="کپی لینک"
                >
                  <HiDocumentDuplicate className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  {/* Tooltip */}
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[10px] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                    کپی لینک
                  </span>
                </button>
              </motion.div>
            </div>
          </div>
          
          {/* Post ID Badge - Bottom Left */}
          <div className="absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 md:bottom-3 md:left-3 z-10">
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
              <span className="text-[10px] sm:text-xs font-mono text-white/90">
                #{id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative p-3 sm:p-3.5 md:p-4 lg:p-5 flex flex-col flex-grow">
          {/* Meta info */}
          {!hiddenAuthor ? (
            <div className="mb-2 sm:mb-2.5">
              {postMeta}
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                <svg className="w-3 h-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <FormattedDate date={createdAt} />
                </span>
              </div>
            </div>
          )}
          
          {/* Title */}
          <h3 className="mb-2 sm:mb-2.5 md:mb-3 text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white leading-snug sm:leading-relaxed group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-200">
            <Link 
              href={getPostLink(postType, slug)} 
              className="line-clamp-2 relative z-10 hover:underline decoration-2 underline-offset-2" 
              title={title}
            >
              {title}
            </Link>
          </h3>
          
          {/* Post Type Badge */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              {postType === 'STANDARD' && '📝 استاندارد'}
              {postType === 'VIDEO' && '🎥 ویدیو'}
              {postType === 'GALLERY' && '🖼️ گالری'}
              {postType === 'AUDIO' && '🎵 صوتی'}
            </span>
          </div>
          
          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-auto pt-2.5 sm:pt-3 md:pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BookmarkCheck post={post}>
                {(isBookmarked) => (
                  <PostCardSaveAction
                    className="relative z-10"
                    postId={post.id}
                    initialBookmarked={isBookmarked}
                    bookmarkClass="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-violet-50 dark:bg-slate-800 dark:hover:bg-violet-900/30 hover:scale-105 active:scale-95 transition-all duration-200"
                  />
                )}
              </BookmarkCheck>
            </div>
            <PostCardLikeAndComment className="relative z-10" post={post} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CardList;
