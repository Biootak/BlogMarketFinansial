//src\components\Dashboard\CardList.tsx
'use client';

import React, { type FC, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HiEllipsisVertical, HiPencil, HiTrash, HiEye, HiEyeSlash } from 'react-icons/hi2';
import PostCardSaveAction from '@/components/PostCardSaveAction/PostCardSaveAction';
import type { PostWithRelations } from '@/types/types';
import CategoryBadgeList from '@/components/CategoryBadgeList/CategoryBadgeList';
import PostCardLikeAndComment from '@/components/PostCardLikeAndComment/PostCardLikeAndComment';
import PostCardMeta from '@/components/PostCardMeta/PostCardMeta';
import PostFeaturedMedia from '@/components/PostFeaturedMedia/PostFeaturedMedia';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import PostStatusBadge from '../Blog/PostStatusBadge';

import BookmarkCheck from '../../BookmarkCheck';

export interface CardListProps {
  className?: string;
  post: PostWithRelations;
  ratio?: string;
  hiddenAuthor?: boolean;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: PostWithRelations['status']) => void;
}

const cardVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const CardList: FC<CardListProps> = ({
  className = 'h-full',
  post,
  hiddenAuthor = false,
  ratio = 'aspect-w-4 aspect-h-3',
  onDelete,
  onStatusChange,
}) => {
  const { title, id, slug, createdAt } = post;
  const [isHover, setIsHover] = useState(false);

  const handleDelete = useCallback(() => {
    if (window.confirm('آیا از حذف این پست اطمینان دارید؟')) {
      onDelete(id);
    }
  }, [id, onDelete]);

  const handleStatusChange = useCallback(() => {
    const newStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    onStatusChange(post.id, newStatus);
  }, [post.id, post.status, onStatusChange]);

  const postMeta = useMemo(() => <PostCardMeta meta={post} />, [post]);

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5 }}
      className={cn(
        'nc-Card11 relative flex flex-col group rounded-t-3xl overflow-hidden bg-dark-500 dark:bg-neutral-900 rtl',
        className,
      )}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <div
        className={cn(
          'block flex-shrink-0 relative w-full rounded-t-3xl overflow-hidden z-10',
          ratio,
        )}
      >
        <div>
          <PostFeaturedMedia post={post} isHover={isHover} />
        </div>
        <div className="absolute top-3 left-3  rounded-full  z-20">
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
              <DropdownMenuItem onClick={handleStatusChange}>
                {post.status === 'PUBLISHED' ? (
                  <>
                    <HiEyeSlash className="w-4 h-4 ml-2" />
                    <span>تبدیل به پیش‌نویس</span>
                  </>
                ) : (
                  <>
                    <HiEye className="w-4 h-4 ml-2" />
                    <span>انتشار پست</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  href={`/dashboard/admin/posts/edit/${id}`}
                  className="flex items-center w-full"
                >
                  <HiPencil className="w-4 h-4 ml-2" />
                  <span>ویرایش</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                <HiTrash className="w-4 h-4 ml-2" />
                <span>حذف</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Link href={`/single/${slug}`} className="absolute inset-0 z-0" />
      <span className="absolute top-3 left-3 z-10">
        <PostStatusBadge status={post.status} />
      </span>

      <div className="p-4 flex flex-col flex-grow">
        {!hiddenAuthor ? (
          postMeta
        ) : (
          <span className="text-xs text-neutral-500 rtl:text-right">{formatDate(createdAt)}</span>
        )}
        <h3 className="nc-card-title block text-base font-semibold text-neutral-900 dark:text-neutral-100 my-3">
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
    </motion.div>
  );
};

export default CardList;
