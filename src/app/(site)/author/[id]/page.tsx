import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import DynamicCategories from '@/components/DynamicCategories';
import { getAuthorById } from '@/actions/authorActions';
import { getCategories } from '@/actions/categoryActions';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getPostsByAuthor } from '@/actions/getPostsByAuthor';
import AuthorProfile from '../Author/AuthorProfile';
import AuthorContent from '../Author/AuthorContent';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';

type PageAuthorProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function PageAuthor({ params, searchParams }: PageAuthorProps) {
  const currentPage =
    typeof searchParams.page === 'string' ? Number.parseInt(searchParams.page, 10) : 1;
  const currentFilter = typeof searchParams.filter === 'string' ? searchParams.filter : 'جدیدترین';

  const authorResult = await getAuthorById(params.id);
  if (!authorResult.success || !authorResult.data) {
    notFound();
  }

  const author = authorResult.data;
  const [categoriesResult, topAuthorsResult, postsResult] = await Promise.all([
    getCategories({ limit: 10, page: 1 }),
    getTopAuthors(5),
    getPostsByAuthor(author.id, { page: currentPage, limit: 12, filter: currentFilter }),
  ]);

  return (
    <div className="nc-PageAuthor">
      <AuthorProfile author={author} />

      <div className="container py-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <AuthorContent
          initialPosts={postsResult.data?.posts || []}
          totalPages={postsResult.data?.pages || 1}
          authorId={author.id}
          initialPage={currentPage}
          initialFilter={currentFilter}
        />

        <Suspense fallback={<div>در حال بارگذاری دسته‌بندی‌ها...</div>}>
          <DynamicCategories
            initialCategories={categoriesResult.data?.categories || []}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
        </Suspense>
        <Suspense fallback={<div>در حال بارگذاری نویسندگان...</div>}>
          <SectionSliderNewAuthors
            heading="قلم‌های برتر"
            subHeading="با ذهن‌های خلاق پشت مقالات ما آشنا شوید"
            authors={topAuthorsResult || []}
            itemPerRow={5}
          />
        </Suspense>

        <SectionSubscribe2 />
      </div>
    </div>
  );
}
