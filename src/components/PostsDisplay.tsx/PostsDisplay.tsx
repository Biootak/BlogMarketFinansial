// components/PostsDisplay/PostsDisplay.tsx
import type { Advertisement, PostWithRelations } from '@/types/types';
import PostsList from './PostsList';
import LoadMoreButton from '../LoadMoreButton';
import { notFound } from 'next/navigation';

interface PostsDisplayProps {
  posts: PostWithRelations[];
  onLoadMore: () => void;
  ads: Advertisement[];
  isLoading: boolean;
  hasMore: boolean;
}

export default function PostsDisplay({
  posts,

  onLoadMore,
  isLoading,
  hasMore,
}: PostsDisplayProps) {
  if (posts.length === 0) {
    return notFound();
  }

  return (
    <div className="space-y-8">
      <PostsList posts={posts} />
      <LoadMoreButton onLoadMore={onLoadMore} isLoading={isLoading} hasMore={hasMore} />
    </div>
  );
}
