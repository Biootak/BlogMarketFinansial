'use client';

import { getLatestPosts } from '@/actions/getLatestPosts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { motion } from 'framer-motion';
import { Newspaper, Sparkles } from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';
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
    <section className="relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-50/50 to-transparent dark:via-neutral-900/50 rounded-2xl sm:rounded-3xl -z-10" />

      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
        {/* Header */}
        <div className="relative px-4 sm:px-5 md:px-6 lg:px-8 pt-4 sm:pt-5 md:pt-6 pb-3 sm:pb-4 border-b border-neutral-100 dark:border-neutral-800">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-50/50 via-transparent to-primary-50/50 dark:from-primary-900/20 dark:to-primary-900/20" />

          <div className="relative flex items-center justify-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg sm:rounded-xl">
              <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-900 dark:text-white">
              آخرین مقالات
            </h2>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg sm:rounded-xl text-red-600 dark:text-red-400 text-center text-xs sm:text-sm">
            خطا: {error.message}
          </div>
        )}

        <Tabs defaultValue="همه" onValueChange={setActiveCategory} dir="rtl" className="w-full">
          {/* Tabs Navigation */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <TabsList className="w-full flex items-center justify-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-xl sm:rounded-2xl overflow-x-auto hide-scrollbar">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="relative flex-1 sm:flex-none px-2 xs:px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:text-primary-600 dark:data-[state=active]:text-primary-400 data-[state=active]:shadow-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 whitespace-nowrap"
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
              className="mt-0 p-3 sm:p-4 md:p-6 focus-visible:outline-none focus-visible:ring-0"
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
