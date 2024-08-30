'use client';

import React, { useState, useCallback, useEffect } from 'react';
import PostsDisplay from '../PostsDisplay.tsx/PostsDisplay';
import { getLatestPosts } from '@/actions/getLatestPosts';
import type { Advertisement, PostWithRelations } from '@/types/types';

interface ClientSidePostsProps {
  initialPosts: PostWithRelations[];
  initialAds: Advertisement[];
}
const POSTS_PER_PAGE = 6;

export default function ClientSidePosts({ initialPosts, initialAds }: ClientSidePostsProps) {
  const [posts, setPosts] = useState<PostWithRelations[]>(initialPosts);
  const [ads] = useState<Advertisement[]>(initialAds);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null); // Reset error state

    try {
      const newPosts = await getLatestPosts({
        count: POSTS_PER_PAGE,
        skip: posts.length,
      });

      if (newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
        setHasMore(newPosts.length === POSTS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [posts.length, isLoading, hasMore]);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">آخرین مقالات</h2>
      {error && <div>Error: {error.message}</div>}
      <PostsDisplay
        posts={posts}
        ads={ads}
        onLoadMore={loadMorePosts}
        isLoading={isLoading}
        hasMore={hasMore}
      />
    </div>
  );
}
