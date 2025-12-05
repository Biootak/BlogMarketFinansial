'use client';

import React, { type FC } from 'react';
import PostCardInfo from '@/components/PostCardInfo/PostCardInfo';
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
  post,
}) => {
  if (!post) {
    return null;
  }

  return (
    <div className={`nc-PostCardLikeAndComment ${className}`}>
      <PostCardInfo
        views={post.viewCount}
        readingTime={post.readingTime}
        publishDate={post.createdAt}
        showViews={true}
        showReadingTime={true}
        showDate={false}
        compact={false}
      />
    </div>
  );
};

export default PostCardLikeAndComment;
