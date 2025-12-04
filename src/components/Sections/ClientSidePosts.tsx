'use client';

import type React from 'react';
import { useState, useCallback } from 'react';
import { getLatestPosts } from '@/actions/getLatestPosts';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Empty from '../Empty';
import PostsDisplay from '../PostsDisplay.tsx/PostsDisplay';
import { motion } from 'framer-motion';
import { Newspaper, Sparkles } from 'lucide-react';

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
    <section className="relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-50/50 to-transparent dark:via-neutral-900/50 rounded-3xl -z-10" />
      
      <div className="relative overflow-hidden rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
        {/* Header */}
        <div className="relative px-5 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-50/50 via-transparent to-primary-50/50 dark:from-primary-900/20 dark:to-primary-900/20" />
          
          <div className="relative flex items-center justify-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-xl">
              <Newspaper className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
              آخرین مقالات
            </h2>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-center text-sm">
            خطا: {error.message}
          </div>
        )}

        <Tabs defaultValue="همه" onValueChange={setActiveCategory} dir="rtl" className="w-full">
          {/* Tabs Navigation */}
          <div className="px-4 sm:px-6 py-4">
            <TabsList className="w-full flex items-center justify-center gap-2 p-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-2xl">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="relative flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:text-primary-600 dark:data-[state=active]:text-primary-400 data-[state=active]:shadow-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Contents */}
          {categories.map((category) => (
            <TabsContent
              key={category}
              value={category}
              className="mt-0 p-4 sm:p-6 focus-visible:outline-none focus-visible:ring-0"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
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
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

export default ClientSidePosts;
