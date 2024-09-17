'use client';

import React, { useState, useCallback } from 'react';
import { getLatestPosts } from '@/actions/getLatestPosts';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Empty from '../Empty';
import PostsDisplay from '../PostsDisplay.tsx/PostsDisplay';

interface ClientSidePostsProps {
  initialPosts: Record<string, PostWithRelations[]>;
  initialAds: Advertisement[];
  categories: string[];
}

const POSTS_PER_PAGE = 6;

export default function ClientSidePosts({ initialPosts, initialAds, categories }: ClientSidePostsProps) {
  const [posts, setPosts] = useState<Record<string, PostWithRelations[]>>(initialPosts);
  const [ads] = useState<Advertisement[]>(initialAds);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {};
    for (const category of categories) {
      result[category] = true;
    }
    return result;
  });
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
        setHasMore((prev) => {
          const updated = Object.assign({}, prev);
          updated[activeCategory] = false;
          return updated;
        });
      } else {
        setPosts((prev) => {
          const updated = Object.assign({}, prev);
          updated[activeCategory] = currentPosts.concat(newPosts);
          return updated;
        });
        setHasMore((prev) => {
          const updated = Object.assign({}, prev);
          updated[activeCategory] = newPosts.length === POSTS_PER_PAGE;
          return updated;
        });
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
      <h2 className="text-3xl font-bold">آخرین مقالات</h2>
      {error && <div>Error: {error.message}</div>}
      <Tabs defaultValue="همه" onValueChange={setActiveCategory} dir='rtl'>
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((category) => (
          <TabsContent key={category} value={category}>
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