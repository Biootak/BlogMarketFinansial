'use client';

import React, { useEffect, useState } from 'react';
import { getArchivePosts } from '@/actions/postActions';
import Nav from '@/components/Nav/Nav';
import NavItem from '@/components/NavItem/NavItem';
import Card11 from '@/components/Card11/Card11';
import CardCategory2 from '@/components/CardCategory2/CardCategory2';
import Tag from '@/components/Tag/Tag';
import CardAuthorBox2 from '@/components/CardAuthorBox2/CardAuthorBox2';
import ButtonPrimary from '@/components/Button/ButtonPrimary';
import Pagination from '@/components/Pagination/Pagination';

const TABS = ['مقالات', 'دسته‌بندی‌ها', 'برچسب‌ها', 'نویسندگان'];

interface SearchResultsProps {
  searchQuery: string;
  activeTab: string;
  page: number;
}

function SearchResults({ searchQuery, activeTab, page }: SearchResultsProps) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await getArchivePosts(page, 12, 'جدیدترین', undefined, undefined);
        if (response.success) {
          setResult(response.data);
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError('خطا در بارگیری نتایج');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [page, searchQuery, activeTab]);

  if (loading) return <div>در حال بارگذاری...</div>;
  if (error) return <div>خطا: {error}</div>;
  if (!result) return <div>نتیجه‌ای یافت نشد</div>;

  const { posts, total, pages } = result;

  return (
    <div>
      <Nav
        containerClassName="w-full overflow-x-auto hiddenScrollbar"
        className="sm:space-x-2 rtl:space-x-reverse"
      >
        {TABS.map((item, index) => (
          <NavItem key={index} isActive={item === activeTab}>
            {item}
          </NavItem>
        ))}
      </Nav>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-8 mt-8 lg:mt-10">
        {activeTab === 'مقالات' && posts.map((post: any) => <Card11 key={post.id} post={post} />)}
        {activeTab === 'دسته‌بندی‌ها' &&
          posts.map((post: any) => <CardCategory2 key={post.id} taxonomy={post} />)}
        {activeTab === 'برچسب‌ها' && (
          <div className="flex flex-wrap col-span-full">
            {posts.map((post: any) => (
              <Tag className="mb-3 mr-3" key={post.id} tag={post} />
            ))}
          </div>
        )}
        {activeTab === 'نویسندگان' &&
          posts.map((post: any) => <CardAuthorBox2 key={post.id} author={post.author} />)}
      </div>

      <div className="flex flex-col mt-12 lg:mt-16 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
        <Pagination currentPage={page} totalPages={pages} />
      </div>
    </div>
  );
}

export default SearchResults;
