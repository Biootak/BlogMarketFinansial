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
  ads,
  onLoadMore,
  isLoading,
  hasMore,
}: PostsDisplayProps) {
  if (posts.length === 0) {
    return null; // یا می‌توانید یک کامپوننت "محتوا یافت نشد" را نمایش دهید
  }

  return (
    <div className="space-y-8">
      <PostsList posts={posts} ads={ads} />
      <LoadMoreButton onLoadMore={onLoadMore} isLoading={isLoading} hasMore={hasMore} />
    </div>
  );
}
