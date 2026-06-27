'use client';

import React, { type FC, useRef, useState } from 'react';
import Avatar from '@/components/Avatar/Avatar';
import NcDropDown from '@/components/NcDropDown/NcDropDown';
import twFocusClass from '@/utils/twFocusClass';
import ModalEditComment from './ModalEditComment';
import ModalDeleteComment from './ModalDeleteComment';
import ModalReportItem from '@/components/ModalReportItem/ModalReportItem';
import Link from 'next/link';
import SingleCommentForm from '@/app/(site)/(singles)/SingleCommentForm';
import CommentCardLikeReply from '../CommentCardLikeReply/CommentCardLikeReply';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { useCommentStore } from '@/hooks/useCommentStore';
import FormattedDate from '../FormattedDate';
import type { CommentWithRelationsAndLikes, NcDropDownItem } from '@/types/types';
import { likeItem } from '@/actions/postActions';
import { HiOutlinePencil, HiOutlineReply, HiOutlineFlag, HiOutlineTrash } from 'react-icons/hi';


export interface CommentCardProps {
  className?: string;
  comment: CommentWithRelationsAndLikes;
  size?: 'large' | 'normal';
}

const CommentCard: FC<CommentCardProps> = ({ className = '', comment, size = 'large' }) => {
  const { addComment, deleteComment, editComment } = useCommentStore();
  const { toast } = useToast();
  const { data: session } = useSession();

  const { id, content, createdAt, author, postId } = comment;

  const [commentContent, setCommentContent] = useState(content);

  const actions: NcDropDownItem[] = [
    {
      id: 'edit',
      name: 'ویرایش',
      icon: HiOutlinePencil,
    },
    {
      id: 'reply',
      name: 'پاسخ',
      icon: HiOutlineReply,
    },
    {
      id: 'report',
      name: 'گزارش تخلف',
      icon: HiOutlineFlag,
    },
    {
      id: 'delete',
      name: 'حذف',
      icon: HiOutlineTrash,
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
        variant: 'success',
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

  const handleDeleteComment = async () => {
    try {
      const result = await deleteComment(id);
      if (result.success) {
        toast({
          title: 'موفقیت',
          description: 'نظر با موفقیت حذف شد',
          variant: 'success',
        });
        closeModalDeleteComment();
      }
    } catch (error) {
      console.error('خطا در حذف نظر:', error);
      toast({
        title: 'خطا',
        description: 'خطا در حذف نظر',
        variant: 'destructive',
      });
    }
  };

  const handleEditComment = async (newContent: string) => {
    if (!session) {
      toast({
        title: 'خطا',
        description: 'برای ویرایش نظر باید وارد شوید.',
        variant: 'destructive',
      });
      return;
    }

    const result = await editComment(id, newContent);
    if (result.success) {
      setCommentContent(newContent);
      toast({
        title: 'موفقیت',
        description: 'نظر شما با موفقیت ویرایش شد.',
        variant: 'success',
      });
      closeModalEditComment();
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
          imgUrl={author.profile?.avatar || author.image}
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
              <FormattedDate date={createdAt} />
            </span>
          </div>

          <span className="block text-neutral-700 mt-2 mb-3 sm:mt-3 sm:mb-4 dark:text-neutral-300">
            {commentContent}
          </span>

          {isReplying ? (
            renderCommentForm()
          ) : (
            <CommentCardLikeReply className={className} onClickReply={openReplyForm} />
          )}
        </div>
      </div>

      <ModalEditComment
        show={isEditing}
        onCloseModalEditComment={closeModalEditComment}
        comment={comment}
        onEditComment={handleEditComment}
      />
      <ModalReportItem show={isReporting} onCloseModalReportItem={closeModalReportComment} />
      <ModalDeleteComment
        show={isDeleting}
        onCloseModalDeleteComment={closeModalDeleteComment}
        onConfirmDelete={handleDeleteComment}
      />
    </>
  );
};

export default CommentCard;
