'use client';

import type React from 'react';
import { useState, useCallback } from 'react';
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

const ClientSidePosts: React.FC<ClientSidePostsProps> = ({
  initialPosts,
  initialAds,
  categories,
}) => {
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
    <div className="space-y-4 bg-white/10 dark:bg-neutral-800/10 backdrop-blur-lg backdrop-saturate-150 border border-white/20 dark:border-neutral-700/20 p-4 rounded-2xl">
      <h2 className="text-xl font-bold text-center mb-4">آخرین مقالات</h2>
      {error && <div className="text-red-500 text-center">Error: {error.message}</div>}
      <Tabs defaultValue="همه" onValueChange={setActiveCategory} dir="rtl">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
          </div>
          <div className="relative flex justify-center">
            <TabsList className="inline-flex items-center px-1 py-1 rounded-2xl
              bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md
              border border-white/20 dark:border-neutral-700/20">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm 
                    ring-offset-background focus-visible:outline-none focus-visible:ring-2 
                    focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none 
                    disabled:opacity-50 h-10 font-medium px-4 sm:px-6 rounded-full
                    transition-all duration-300 group
                    text-neutral-600 dark:text-neutral-300
                    data-[state=active]:bg-gradient-to-l data-[state=active]:from-primary-500 
                    data-[state=active]:to-secondary-500 data-[state=active]:text-white
                    data-[state=active]:hover:from-primary-600 data-[state=active]:hover:to-secondary-600
                    data-[state=active]:shadow-lg data-[state=active]:hover:shadow-xl"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-8 p-0 bg-transparent shadow-none ring-0">
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
};

export default ClientSidePosts;
