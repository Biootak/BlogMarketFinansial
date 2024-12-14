'use client';
/**
 * @format
 * @file PostList by Id
 * @author fe6
 */

import { useCallback, useState } from 'react';

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

import { deletePost, listAllPosts, updatePostStatus } from '@/actions/postActions';


import type { ActionResult, PostWithRelations, PostStatus } from '@/types/types';

import LoadingMore from '@/components/LoadingMore';

import CardList from '../DashboardPage/CardList';
import { toast } from '@/components/ui/use-toast';
import { invalidateHomePageData, invalidatePostData } from '@/services/cacheService';

export default function PostList({
  initialPosts,

  hasNextPage: initialHasNextPage,

  totalPages,
}: {
  initialPosts: PostWithRelations[];

  hasNextPage: boolean;

  totalPages: number;
}) {
  const [posts, setPosts] = useState(initialPosts);

  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(2);

  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);

  const loadMore = useCallback(async () => {
    if (hasNextPage && !isLoading) {
      setIsLoading(true);

      const result: ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }> =
        await listAllPosts(page);

      if (result.success && result.data) {
        const newPosts = result.data.posts || [];

        setPosts((prev) => [...prev, ...newPosts]);

        setPage((prev) => prev + 1);

        setHasNextPage(page < totalPages);
      }

      setIsLoading(false);
    }
  }, [hasNextPage, isLoading, page, totalPages]);

  const infiniteScrollRef = useInfiniteScroll(loadMore, hasNextPage, isLoading);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      const result = await deletePost(postId);
      if (!result.error) {
        // Invalidate caches after successful deletion
        await invalidatePostData(postId);
        await invalidateHomePageData();
        toast({
          title: 'موفقیت',
          description: 'پست با موفقیت حذف شد',
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'خطا',
        description: 'خطا در حذف پست',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleChangeStatus = useCallback(async (
    postId: string,
    newStatus: PostWithRelations['status'],
  ): Promise<boolean> => {
    try {
      const result = await updatePostStatus(postId, newStatus);
      if (!result.error) {
        // Invalidate caches after status update
        await invalidatePostData(postId);
        await invalidateHomePageData();
        setPosts((prev) =>
          prev.map((post) => (post.id === postId ? { ...post, status: newStatus } : post)),
        );
        toast({
          title: 'موفقیت',
          description: 'وضعیت پست با موفقیت بروز شد',
          variant: 'success',
        });
        return true;
      } else {
        toast({
          title: 'خطا',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating post status:', error);
      toast({
        title: 'خطا',
        description: 'خطا در بروزرسانی وضعیت پست',
        variant: 'destructive',
      });
    }
    return false;
  }, [toast]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
      {posts.map((post) => {
        return (
          <CardList
            key={post.id}
            post={post}
            onDelete={handleDeletePost}
            onStatusChange={handleChangeStatus}
          />
        );
      })}

      {isLoading && <LoadingMore message="در حال دریافت پست‌های بیشتر..." />}

      <div ref={infiniteScrollRef} style={{ height: '1px' }} />
    </div>
  );
}
