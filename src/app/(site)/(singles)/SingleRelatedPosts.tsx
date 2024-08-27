'use client';

import React, { type FC, useEffect, useState } from 'react';
import Heading from '@/components/Heading/Heading';
import Card11 from '@/components/Card11/Card11';
import Card9 from '@/components/Card9/Card9';
import type { PostWithRelations } from '@/types/types';

import { useToast } from '@/components/ui/use-toast';
import { usePostStore } from '@/hooks/postStore';

export interface SingleRelatedPostsProps {
  post: PostWithRelations;
  relatedPosts: PostWithRelations[];
  moreFromAuthor: PostWithRelations[];
}

const SingleRelatedPosts: FC<SingleRelatedPostsProps> = ({
  post,
  relatedPosts,
  moreFromAuthor,
}) => {
  // اگر هیچ پست مرتبط یا پست بیشتری از همان نویسنده وجود نداشت، کامپوننت چیزی رندر نمی‌کند
  if (relatedPosts.length === 0 && moreFromAuthor.length === 0) {
    return null;
  }

  return (
    <div className="relative bg-neutral-100 dark:bg-neutral-800 py-16 lg:py-28 mt-16 lg:mt-28">
      <div className="container">
        {/* نمایش پست‌های مرتبط */}
        {relatedPosts.length > 0 && (
          <div>
            <Heading className="mb-10 text-neutral-900 dark:text-neutral-50" desc="">
              پست‌های مرتبط
            </Heading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {relatedPosts.map((relatedPost) => (
                <Card11 key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </div>
        )}

        {/* نمایش پست‌های بیشتر از همان نویسنده */}
        {moreFromAuthor.length > 0 && (
          <div className="mt-20">
            <Heading className="mb-10 text-neutral-900 dark:text-neutral-50" desc="">
              پست‌های بیشتر از {post.author.name}
            </Heading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {moreFromAuthor.map((authorPost) => (
                <Card9 key={authorPost.id} post={authorPost} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleRelatedPosts;
