import { Suspense } from 'react';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import type { Metadata } from 'next';
import SearchHeader from './SearchHeader';
import SearchResults from './SearchResults';
import type { SearchParamsType } from '@/types/types';

export const metadata: Metadata = {
  title: 'جستجو | وبلاگ ما',
  description: 'نتایج جستجو در وبلاگ ما',
};

export default function PageSearch({ searchParams }: { searchParams: SearchParamsType }) {
  const { q: searchQuery = '', tab = 'مقالات', page = '1' } = searchParams;

  return (
    <div className="nc-PageSearch">
      <SearchHeader initialSearchQuery={searchQuery} />
      <div className="container py-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <main>
          <Suspense fallback={<div>در حال بارگذاری...</div>}>
            <SearchResults searchQuery={searchQuery} activeTab={tab} page={Number.parseInt(page)} />
          </Suspense>
        </main>

        <SectionSubscribe2 />
      </div>
    </div>
  );
}
