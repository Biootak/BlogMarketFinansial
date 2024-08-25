'use client';

import React, { type FC, useRef, useState } from 'react';
import Avatar from '@/components/Avatar/Avatar';
import NcDropDown, { type NcDropDownItem } from '@/components/NcDropDown/NcDropDown';
import twFocusClass from '@/utils/twFocusClass';
import ModalEditComment from './ModalEditComment';
import ModalDeleteComment from './ModalDeleteComment';
import ModalReportItem from '@/components/ModalReportItem/ModalReportItem';
import Link from 'next/link';
import SingleCommentForm from '@/app/(site)/(singles)/SingleCommentForm';
import CommentCardLikeReply from '../CommentCardLikeReply/CommentCardLikeReply';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/utils/formatDate';
import type { CommentWithRelationsAndLikes } from '@/types/types';
import { likeItem } from '@/actions/postActions';
import { useToast } from '@/components/ui/use-toast';
import { useCommentStore } from '@/hooks/useCommentStore';

export interface CommentCardProps {
  className?: string;
  comment: CommentWithRelationsAndLikes;
  size?: 'large' | 'normal';
}

const CommentCard: FC<CommentCardProps> = ({ className = '', comment, size = 'large' }) => {
  const { addComment } = useCommentStore();
  const { toast } = useToast();
  const { data: session } = useSession();

  const { id, content, createdAt, author, likes, _count, postId } = comment;
  const [isLiked, setIsLiked] = useState(
    likes && likes.length > 0 ? likes.some((like) => like.userId === session?.user?.id) : false,
  );
  const [likeCount, setLikeCount] = useState(_count?.likes ?? 0);

  const actions: NcDropDownItem[] = [
    {
      id: 'edit',
      name: 'ویرایش',
      icon: 'las la-edit',
    },
    {
      id: 'reply',
      name: 'پاسخ',
      icon: 'las la-reply',
    },
    {
      id: 'report',
      name: 'گزارش تخلف',
      icon: 'las la-flag',
    },
    {
      id: 'delete',
      name: 'حذف',
      icon: 'las la-trash-alt',
    },
  ];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openReplyForm = () => {
    setIsReplying(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const closeReplyForm = () => {
    setIsReplying(false);
  };

  const openModalEditComment = () => setIsEditing(true);
  const closeModalEditComment = () => setIsEditing(false);

  const openModalReportComment = () => setIsReporting(true);
  const closeModalReportComment = () => setIsReporting(false);

  const openModalDeleteComment = () => setIsDeleting(true);
  const closeModalDeleteComment = () => setIsDeleting(false);

  const handleClickDropDown = (item: NcDropDownItem) => {
    switch (item.id) {
      case 'reply':
        return openReplyForm();
      case 'edit':
        return openModalEditComment();
      case 'report':
        return openModalReportComment();
      case 'delete':
        return openModalDeleteComment();
      default:
        return;
    }
  };

  const handleLikeClick = async () => {
    if (!session) {
      toast({
        title: 'خطا',
        description: 'برای لایک کردن باید وارد شوید.',
        variant: 'destructive',
      });
      return;
    }

    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);

    const result = await likeItem(id, 'comment');
    if (!result.success) {
      setIsLiked(!newIsLiked);
      setLikeCount(likeCount);
      toast({
        title: 'خطا',
        description: result.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'موفقیت',
        description: 'وضعیت لایک با موفقیت به‌روزرسانی شد.',
        variant: 'default',
      });
    }
  };

  const handleSubmitReply = async (content: string) => {
    if (!session) {
      toast({
        title: 'خطا',
        description: 'برای ارسال پاسخ باید وارد شوید.',
        variant: 'destructive',
      });
      return;
    }

    const result = await addComment(postId, content, id);
    if (result.success) {
      toast({
        title: 'موفقیت',
        description: 'پاسخ شما با موفقیت ثبت شد.',
        variant: 'default',
      });
      closeReplyForm();
    } else {
      toast({
        title: 'خطا',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const renderCommentForm = () => {
    return (
      <SingleCommentForm
        textareaRef={textareaRef}
        onClickSubmit={handleSubmitReply}
        onClickCancel={closeReplyForm}
        className="flex-grow"
        postId={postId}
      />
    );
  };

  return (
    <>
      <div className={`nc-CommentCard flex ${className}`}>
        <Avatar
          sizeClass={`h-6 w-6 text-base ${size === 'large' ? 'sm:text-lg sm:h-8 sm:w-8' : ''}`}
          radius="rounded-full"
          containerClassName="mt-4"
          imgUrl={author.image || undefined}
        />
        <div className="flex-grow flex flex-col p-4 ms-2 text-sm border border-neutral-200 rounded-xl sm:ms-3 sm:text-base dark:border-neutral-700">
          <div className="relative flex items-center pe-6">
            <div className="absolute -end-3 -top-3">
              <NcDropDown
                className={`p-2 text-neutral-500 flex items-center justify-center rounded-lg hover:text-neutral-800 dark:hover:text-neutral-200 sm:hover:bg-neutral-100 dark:hover:bg-neutral-800 ${twFocusClass()}`}
                data={actions}
                onClick={handleClickDropDown}
              />
            </div>
            <Link
              className="flex-shrink-0 font-semibold text-neutral-800 dark:text-neutral-100"
              href={`/profile/${author.id}`}
            >
              {author.name}
            </Link>
            <span className="mx-2">·</span>
            <span className="text-neutral-500 dark:text-neutral-400 text-xs line-clamp-1 sm:text-sm">
              {formatDate(createdAt)}
            </span>
          </div>

          <span className="block text-neutral-700 mt-2 mb-3 sm:mt-3 sm:mb-4 dark:text-neutral-300">
            {content}
          </span>

          {isReplying ? (
            renderCommentForm()
          ) : (
            <CommentCardLikeReply
              className={className}
              isLiked={isLiked}
              likeCount={likeCount}
              onClickReply={openReplyForm}
              onClickLike={handleLikeClick}
            />
          )}
        </div>
      </div>

      {/* <ModalEditComment
        show={isEditing}
        onCloseModalEditComment={closeModalEditComment}
        comment={comment}
      />
      <ModalReportItem show={isReporting} onCloseModalReportItem={closeModalReportComment} />
      <ModalDeleteComment show={isDeleting} onCloseModalDeleteComment={closeModalDeleteComment} /> */}
    </>
  );
};

export default CommentCard;
