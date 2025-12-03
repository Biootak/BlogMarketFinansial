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
        <div className="flex justify-between items-center mb-6">
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden">
                <Filter className="h-4 w-4" />
                <span className="sr-only">فیلتر</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {FILTERS.map((filter) => (
                <DropdownMenuItem
                  key={filter.name}
                  onSelect={() => handleFilterChange(filter.name)}
                  className="text-sm"
                >
                  {filter.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <TabsList className="inline-flex items-center bg-white dark:bg-neutral-800 px-2 py-1 rounded-full shadow-sm overflow-x-auto max-w-full">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-2 py-1 text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden sm:flex text-sm whitespace-nowrap">
                {currentFilter}
                <ChevronDown className="mr-2 h-4 w-4" />
                <span className="sr-only">انتخاب فیلتر</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {FILTERS.map((filter) => (
                <DropdownMenuItem
                  key={filter.name}
                  onSelect={() => handleFilterChange(filter.name)}
                  className="text-sm"
                >
                  {filter.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <TabsContent value="مقالات" className="mt-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">در حال بارگذاری...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {posts.map((post) => (
                  <Card11 key={post.id} post={post} />
                ))}
              </div>
              {posts.length === 0 && <Empty />}
              <div className="flex justify-center mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  className="text-sm sm:text-base"
                />
              </div>
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
