'use client';

import {
  deletePostAndInvalidate,
  listAllPosts,
  updatePostStatusAndInvalidate,
} from '@/actions/postActions';
import LoadingMore from '@/components/LoadingMore';
import { toast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { ActionResult, PostStatus, PostWithRelations } from '@/types/types';
import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import CardList from '../DashboardPage/CardList';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

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
      const result = await deletePostAndInvalidate(postId);
      if (result.success) {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
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
  }, []);

  const handleChangeStatus = useCallback(
    async (postId: string, newStatus: PostWithRelations['status']): Promise<boolean> => {
      try {
        const result = await updatePostStatusAndInvalidate(postId, newStatus);
        if (result.success) {
          setPosts((prev) =>
            prev.map((post) => (post.id === postId ? { ...post, status: newStatus } : post)),
          );
          toast({
            title: 'موفقیت',
            description: 'وضعیت پست با موفقیت بروز شد',
            variant: 'success',
          });
          return true;
        }
        toast({
          title: 'خطا',
          description: result.error,
          variant: 'destructive',
        });
      } catch (error) {
        console.error('Error updating post status:', error);
        toast({
          title: 'خطا',
          description: 'خطا در بروزرسانی وضعیت پست',
          variant: 'destructive',
        });
      }
      return false;
    },
    [],
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 py-8"
    >
      {posts.map((post) => (
        <motion.div key={post.id} variants={itemVariants}>
          <CardList post={post} onDelete={handleDeletePost} onStatusChange={handleChangeStatus} />
        </motion.div>
      ))}

      {isLoading && (
        <div className="col-span-full">
          <LoadingMore message="در حال دریافت پست‌های بیشتر..." />
        </div>
      )}

      <div ref={infiniteScrollRef} className="col-span-full h-px" />
    </motion.div>
  );
}
