//src\components\Dashboard\CardList.tsx
'use client';

import { type FC, useState, useCallback, useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import type { PostStatus } from '@prisma/client';
import { 
  HiEllipsisVertical, 
  HiPencil, 
  HiTrash, 
  HiEye, 
  HiEyeSlash,
  HiClipboard,
  HiDocumentText
} from 'react-icons/hi2';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
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

const cardVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const CardList: FC<CardListProps> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = 'aspect-w-4 aspect-h-3',
  onDelete,
  onStatusChange,
}) => {
  const { data: session } = useSession();
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
      // Admins can change between all statuses
      if (post.status === 'PUBLISHED') {
        newStatus = 'PENDING_REVIEW';
        confirmMessage = 'آیا از تغییر وضعیت پست به "در انتظار بررسی" اطمینان دارید؟';
      } else if (post.status === 'PENDING_REVIEW') {
        newStatus = 'PUBLISHED';
        confirmMessage = 'آیا از انتشار این پست اطمینان دارید؟';
      } else {
        // From DRAFT
        newStatus = 'PUBLISHED';
        confirmMessage = 'آیا از انتشار این پیش‌نویس اطمینان دارید؟';
      }
    } else {
      // Authors can only change between DRAFT and PENDING_REVIEW
      if (post.status === 'PUBLISHED') {
        newStatus = 'DRAFT' as PostWithRelations['status'];
        confirmMessage = 'آیا از تبدیل پست به پیش‌نویس اطمینان دارید؟';
      } else if (post.status === 'DRAFT') {
        newStatus = 'PENDING_REVIEW' as PostWithRelations['status'];
        confirmMessage = 'آیا از ارسال پیش‌نویس برای بررسی اطمینان دارید؟';
      } else {
        // From PENDING_REVIEW back to DRAFT
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

  // Check if user has permission to edit/delete this post
  const canEditPost = session?.user?.role === 'SUPER_ADMIN' || 
                     session?.user?.role === 'ADMIN' || 
                     (session?.user?.role === 'AUTHOR' && session?.user?.id === authorId);

  return (
    <Motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5 }}
      className={cn(
        'nc-Card11 relative flex flex-col group rounded-t-3xl overflow-hidden bg-dark-500 dark:bg-neutral-900 rtl',
        className,
      )}
    >
      <div
        className={cn(
          'block flex-shrink-0 relative w-full rounded-t-3xl overflow-hidden z-10',
          ratio,
        )}
      >
        <div>
          <PostFeaturedMedia post={post} />
        </div>
        {canEditPost && (
          <div className="absolute top-3 left-3 rounded-full z-20">
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger
                className="focus:outline-none px-2 transition-colors duration-200"
                aria-label="گزینه‌های بیشتر"
              >
                <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700">
                  <HiEllipsisVertical className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || post.authorId === session?.user?.id) && (
                  <>
                    <DropdownMenuItem onClick={handleStatusChange}>
                      {post.status === 'PUBLISHED' ? (
                        <>
                          <HiEyeSlash className="ml-2" />
                          {session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' 
                            ? 'در انتظار بررسی' 
                            : 'پیش‌نویس کردن'}
                        </>
                      ) : post.status === 'DRAFT' ? (
                        <>
                          <HiClipboard className="ml-2" />
                          ارسال برای بررسی
                        </>
                      ) : (
                        <>
                          {session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' ? (
                            <>
                              <HiEye className="ml-2" />
                              انتشار
                            </>
                          ) : (
                            <>
                              <HiPencil className="ml-2" />
                              برگشت به پیش‌نویس
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/posts/edit/${post.id}`}>
                        <HiPencil className="ml-2" />
                        ویرایش
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <HiTrash className="ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <Link href={getPostLink(postType, slug)} className="absolute inset-0 z-0" />
      <span className="absolute top-3 left-3 z-10">
        <PostStatusBadge status={post.status} />
      </span>

      <div className="p-4 flex flex-col flex-grow">
        {!hiddenAuthor ? (
          postMeta
        ) : (
          <span className="text-xs text-neutral-500 rtl:text-right">
            {' '}
            <FormattedDate date={createdAt} />
          </span>
        )}
        <h3 className="nc-card-title block text-sm font-semibold text-neutral-900 dark:text-neutral-100 my-3">
          <span className="line-clamp-2" title={title}>
            {title}
          </span>
        </h3>
        <div className="flex flex-row items-end justify-between mt-auto">
          <BookmarkCheck post={post}>
            {(isBookmarked) => (
              <PostCardSaveAction
                className="relative"
                postId={post.id}
                initialBookmarked={isBookmarked}
                bookmarkClass="h-8 w-8 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              />
            )}
          </BookmarkCheck>
          <PostCardLikeAndComment className="relative" post={post} />
        </div>
      </div>
    </Motion.div>
  );
};

export default CardList;
