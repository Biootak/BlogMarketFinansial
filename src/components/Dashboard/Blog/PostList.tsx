'use client';

import { useCallback, useState } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

import { listAllPosts, deletePost, updatePostStatus } from '@/actions/postActions';
import type { ActionResult, PostWithRelations } from '@/types/types';
import LoadingMore from '@/components/LoadingMore';
import CardList from '../DashboardPage/CardList';

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

  const handleDelete = async (id: string) => {
    const result = await deletePost(id);
    if (result.success) {
      setPosts((prev) => prev.filter((post) => post.id !== id));
    }
  };

  const handleStatusChange = async (id: string, newStatus: PostWithRelations['status']) => {
    const result = await updatePostStatus(id, newStatus);
    if (result.success) {
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? { ...post, status: newStatus } : post)),
      );
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
      {posts.map((post) => {
        return (
          <CardList
            key={post.id}
            post={post}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        );
      })}
      {isLoading && <LoadingMore message="در حال دریافت پست‌های بیشتر..." />}
      <div ref={infiniteScrollRef} style={{ height: '1px' }} />
    </div>
  );
}
