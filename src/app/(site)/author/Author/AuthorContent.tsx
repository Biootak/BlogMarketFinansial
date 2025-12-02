'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getPostsByAuthor } from '@/actions/getPostsByAuthor';
import type { PostWithRelations } from '@/types/types';
import Pagination from '@/components/Pagination/Pagination';
import Card11 from '@/components/Card11/Card11';
import { ChevronDown, Filter } from 'lucide-react';
import Empty from '@/components/Empty';

const TABS = ['مقالات', 'مورد علاقه‌ها', 'ذخیره شده‌ها'];
const FILTERS = [
  { name: 'جدیدترین' },
  { name: 'قدیمی‌ترین' },
  { name: 'محبوب‌ترین' },
  { name: 'پربحث‌ترین' },
];

type AuthorContentProps = {
  initialPosts: PostWithRelations[];
  totalPages: number;
  authorId: string;
  initialPage: number;
  initialFilter: string;
};

export default function AuthorContent({
  initialPosts,
  totalPages,
  authorId,
  initialPage,
  initialFilter,
}: AuthorContentProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentFilter, setCurrentFilter] = useState(initialFilter);
  const [isLoading, setIsLoading] = useState(false);

  const loadPosts = async (page: number, filter: string) => {
    setIsLoading(true);
    try {
      const result = await getPostsByAuthor(authorId, { page, limit: 12, filter });
      if (result.success && result.data) {
        setPosts(result.data.posts);
        setCurrentPage(page);
        setCurrentFilter(filter);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    loadPosts(1, filter);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Tabs dir="rtl" defaultValue="مقالات" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <TabsList className="inline-flex items-center bg-white/90 dark:bg-neutral-800/90 backdrop-blur-lg px-2 py-2 rounded-full shadow-lg hover:shadow-xl border border-primary-200/50 dark:border-primary-800/50 overflow-x-auto max-w-full transition-all duration-300">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary-400 data-[state=active]:to-primary-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:scale-105"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-3">
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">فیلتر</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-lg">
                {FILTERS.map((filter) => (
                  <DropdownMenuItem
                    key={filter.name}
                    onSelect={() => handleFilterChange(filter.name)}
                    className="text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  >
                    {filter.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden sm:flex text-sm whitespace-nowrap border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300">
                  {currentFilter}
                  <ChevronDown className="mr-2 h-4 w-4" />
                  <span className="sr-only">انتخاب فیلتر</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-lg">
                {FILTERS.map((filter) => (
                  <DropdownMenuItem
                    key={filter.name}
                    onSelect={() => handleFilterChange(filter.name)}
                    className="text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  >
                    {filter.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <TabsContent value="مقالات" className="mt-8">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
              <p className="mt-4 text-neutral-600 dark:text-neutral-400 font-medium">در حال بارگذاری...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {posts.map((post) => (
                  <Card11 key={post.id} post={post} />
                ))}
              </div>
              {posts.length === 0 && <Empty />}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  className="text-sm sm:text-base"
                  onPageChange={(page) => loadPosts(page, currentFilter)}
                />
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value="مورد علاقه‌ها" className="mt-8">
          <Empty />
        </TabsContent>
        <TabsContent value="ذخیره شده‌ها" className="mt-8">
          <Empty />
        </TabsContent>
      </Tabs>
    </div>
  );
}
