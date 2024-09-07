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
    <Tabs dir="rtl" defaultValue="مقالات" className="w-full">
      <div className="flex justify-between items-center">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {currentFilter} <span className="sr-only">انتخاب فیلتر</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {FILTERS.map((filter) => (
              <DropdownMenuItem key={filter.name} onSelect={() => handleFilterChange(filter.name)}>
                {filter.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TabsContent value="مقالات" className="mt-8">
        {isLoading ? (
          <div className="text-center">در حال بارگذاری...</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {posts.map((post) => (
                <Card11 key={post.id} post={post} />
              ))}
            </div>
            <div className="flex justify-center mt-12">
              <Pagination currentPage={currentPage} totalPages={totalPages} />
            </div>
          </>
        )}
      </TabsContent>

      {/* Add content for other tabs */}
    </Tabs>
  );
}
