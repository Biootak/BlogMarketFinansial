'use client';

import React, { type FC } from 'react';
import { useSession } from 'next-auth/react';
import PostCardCommentBtn from '@/components/PostCardCommentBtn/PostCardCommentBtn';
import PostCardLikeAction from '@/components/PostCardLikeAction/PostCardLikeAction';
import type { PostWithRelations } from '@/types/types';

export interface PostCardLikeAndCommentProps {
  className?: string;
  itemClass?: string;
  hiddenCommentOnMobile?: boolean;
  useOnSinglePage?: boolean;
  post: PostWithRelations;
}

const PostCardLikeAndComment: FC<PostCardLikeAndCommentProps> = ({
  className = '',
  itemClass = 'px-3 h-8 text-xs',
  hiddenCommentOnMobile = true,
  useOnSinglePage = false,
  post,
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  if (!post) {
    return null;
  }

  const isLiked = currentUserId
    ? post.likes?.some((like) => like.userId === currentUserId) ?? false
    : false;

  const likeCount = post._count?.likes ?? 0;
  const commentCount = post._count?.comments ?? 0;

  return (
    <div
      className={`nc-PostCardLikeAndComment flex items-center space-x-2 rtl:space-x-reverse ${className}`}
    >
      <PostCardLikeAction
        className={itemClass}
        postId={post.id}
        initialLikeCount={likeCount}
        initialLiked={isLiked}
      />
      <PostCardCommentBtn
        className={`${hiddenCommentOnMobile ? 'hidden sm:flex' : 'flex'} ${itemClass}`}
        commentCount={commentCount}
        postId={post.id}
        isATagOnSingle={useOnSinglePage}
      />
    </div>
  );
};

export default PostCardLikeAndComment;
