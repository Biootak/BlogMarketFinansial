'use client';

import React from 'react';
import Card11 from '@/components/Card11/Card11';
import CardCategory2 from '@/components/CardCategory2/CardCategory2';
import Tag from '@/components/Tag/Tag';
import CardAuthorBox2 from '@/components/CardAuthorBox2/CardAuthorBox2';
import Pagination from '@/components/Pagination/Pagination';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const TABS = ['مقالات', 'دسته‌بندی‌ها', 'برچسب‌ها', 'نویسندگان'];

interface SearchResultsProps {
  searchQuery: string;
  activeTab: string;
  page: number;
  searchResults: any; // You might want to define a more specific type here
}

function SearchResults({ activeTab, page, searchResults }: SearchResultsProps) {
  if (!searchResults || !searchResults.data) {
    return <div>نتیجه‌ای یافت نشد</div>;
  }

  const { posts, pages } = searchResults.data;

  return (
    <div>
      <Tabs defaultValue={activeTab} dir="rtl">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="مقالات">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-8 mt-8 lg:mt-10">
            {posts.map((post: any) => (
              <Card11 key={post.id} post={post} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="دسته‌بندی‌ها">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-8 mt-8 lg:mt-10">
            {posts.map((post: any) => (
              <CardCategory2 key={post.id} taxonomy={post} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="برچسب‌ها">
          <div className="flex flex-wrap col-span-full mt-8 lg:mt-10">
            {posts.map((post: any) => (
              <Tag className="mb-3 mr-3" key={post.id} tag={post} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="نویسندگان">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-8 mt-8 lg:mt-10">
            {posts.map((post: any) => (
              <CardAuthorBox2 key={post.id} author={post.author} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col mt-12 lg:mt-16 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
        <Pagination currentPage={page} totalPages={pages} />
      </div>
    </div>
  );
}

export default SearchResults;
