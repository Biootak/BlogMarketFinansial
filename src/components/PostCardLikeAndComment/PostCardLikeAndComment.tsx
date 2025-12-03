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
  itemClass = 'w-10 h-10',
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
    ? (post.likes?.some((like) => like.userId === currentUserId) ?? false)
    : false;

  const likeCount = post._count?.likes ?? 0;
  const commentCount = post._count?.comments ?? 0;

  return (
    <div
      className={`nc-PostCardLikeAndComment flex items-center gap-2 ${className}`}
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
        postSlug={post.slug}
        isATagOnSingle={useOnSinglePage}
      />
    </div>
  );
};

export default PostCardLikeAndComment;
