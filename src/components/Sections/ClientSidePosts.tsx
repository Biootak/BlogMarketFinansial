'use client';

import React, { useState, useCallback } from 'react';
import { getLatestPosts } from '@/actions/getLatestPosts';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Empty from '../Empty';
import PostsDisplay from '../PostsDisplay.tsx/PostsDisplay';

interface ClientSidePostsProps {
  initialPosts: Record<string, PostWithRelations[]>;
  initialAds: Advertisement[];
  categories: string[];
}

const POSTS_PER_PAGE = 6;

export default function ClientSidePosts({
  initialPosts,
  initialAds,
  categories,
}: ClientSidePostsProps) {
  const [posts, setPosts] = useState<Record<string, PostWithRelations[]>>(initialPosts);
  const [ads] = useState<Advertisement[]>(initialAds);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map((category) => [category, true])),
  );
  const [error, setError] = useState<Error | null>(null);
  const [activeCategory, setActiveCategory] = useState('همه');

  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore[activeCategory]) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentPosts = posts[activeCategory] || [];
      const newPosts = await getLatestPosts({
        count: POSTS_PER_PAGE,
        skip: currentPosts.length,
        category: activeCategory !== 'همه' ? activeCategory : undefined,
      });

      if (newPosts.length === 0) {
        setHasMore((prev) => ({ ...prev, [activeCategory]: false }));
      } else {
        setPosts((prev) => ({
          ...prev,
          [activeCategory]: [...currentPosts, ...newPosts],
        }));
        setHasMore((prev) => ({
          ...prev,
          [activeCategory]: newPosts.length === POSTS_PER_PAGE,
        }));
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [posts, isLoading, hasMore, activeCategory]);

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-center mb-6">آخرین مقالات</h2>
      {error && <div className="text-red-500 text-center">Error: {error.message}</div>}
      <Tabs defaultValue="همه" onValueChange={setActiveCategory} dir="rtl">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center">
            <TabsList className="inline-flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-8">
            {posts[category] && posts[category].length > 0 ? (
              <PostsDisplay
                posts={posts[category]}
                ads={ads}
                onLoadMore={loadMorePosts}
                isLoading={isLoading}
                hasMore={hasMore[category]}
              />
            ) : (
              <Empty />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
