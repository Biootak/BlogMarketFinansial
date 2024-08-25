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
}

const SingleRelatedPosts: FC<SingleRelatedPostsProps> = ({ post }) => {
  const [relatedPosts, setRelatedPosts] = useState<PostWithRelations[]>([]);
  const [moreFromAuthorPosts, setMoreFromAuthorPosts] = useState<PostWithRelations[]>([]);
  const { fetchPosts, posts } = usePostStore();
  const { toast } = useToast();

  useEffect(() => {
    // تابعی برای یافتن پست‌های مرتبط
    const getRelatedPosts = () => {
      const related = posts
        .filter(
          (p) =>
            p.id !== post.id &&
            p.categories.some((cat) => post.categories.map((c) => c.id).includes(cat.id)),
        )
        .slice(0, 4); // حداکثر 4 پست مرتبط
      setRelatedPosts(related);
    };

    // تابعی برای یافتن پست‌های بیشتر از همان نویسنده
    const getMoreFromAuthor = () => {
      const moreFromAuthor = posts
        .filter((p) => p.id !== post.id && p.authorId === post.authorId)
        .slice(0, 4); // حداکثر 4 پست از همان نویسنده
      setMoreFromAuthorPosts(moreFromAuthor);
    };

    // اگر لیست پست‌ها خالی بود، ابتدا پست‌ها را واکشی می‌کنیم
    if (posts.length === 0) {
      fetchPosts(toast);
    } else {
      // در غیر این صورت، پست‌های مرتبط و پست‌های بیشتر از همان نویسنده را پیدا می‌کنیم
      getRelatedPosts();
      getMoreFromAuthor();
    }
  }, [post, posts, fetchPosts, toast]); // وابستگی‌ها

  // اگر هیچ پست مرتبط یا پست بیشتری از همان نویسنده وجود نداشت، کامپوننت چیزی رندر نمی‌کند
  if (relatedPosts.length === 0 && moreFromAuthorPosts.length === 0) {
    return null;
  }

  return (
    <div className="relative bg-neutral-100 dark:bg-neutral-800 py-16 lg:py-28 mt-16 lg:mt-28">
      <div className="container">
        {/* اگر پست‌های مرتبطی وجود داشت، آن‌ها را نمایش می‌دهیم */}
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

        {/* اگر پست‌های بیشتری از همان نویسنده وجود داشت، آن‌ها را نمایش می‌دهیم */}
        {moreFromAuthorPosts.length > 0 && (
          <div className="mt-20">
            <Heading className="mb-10 text-neutral-900 dark:text-neutral-50" desc="">
              پست‌های بیشتر از {post.author.name}
            </Heading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {moreFromAuthorPosts.map((authorPost) => (
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
