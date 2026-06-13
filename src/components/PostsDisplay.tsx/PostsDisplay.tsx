// components/PostsDisplay/PostsDisplay.tsx
import type { Advertisement, PostWithRelations } from '@/types/types';
import PostsList from './PostsList';
import LoadMoreButton from '../LoadMoreButton';

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
  // حالت خالی رو اینجا handle نمی‌کنیم — ClientSidePosts قبلش چک کرده.
  // فقط وقتی posts صفر نباشه PostsList رو نشون می‌دیم.
  if (posts.length === 0) return null;

  return (
    <div className="space-y-8">
      <PostsList posts={posts} />
      {/* فقط اگه حداقل یا hasMore=true یا داریم لود می‌کنیم دکمه رو نشون بده */}
      {(hasMore || isLoading) && (
        <LoadMoreButton onLoadMore={onLoadMore} isLoading={isLoading} hasMore={hasMore} />
      )}
    </div>
  );
}
