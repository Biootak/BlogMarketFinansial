import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getAuthorById } from '@/actions/authorActions';
import { getCategories } from '@/actions/categoryActions';
import { getPostsByAuthor } from '@/actions/getPostsByAuthor';
import dynamic from 'next/dynamic';
import { getTopAuthors } from '@/actions/getTopAuthors';
import DynamicCategories from '@/components/DynamicCategories';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import for heavy slider component
const SectionSliderNewAuthors = dynamic(
  () => import('@/components/SectionSliderNewAthors/SectionSliderNewAuthors'),
  {
    loading: () => <Skeleton className="w-full h-64" />,
    ssr: true,
  }
);
import AuthorContent from '../Author/AuthorContent';
import AuthorProfile from '../Author/AuthorProfile';

type PageAuthorProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PageAuthor({ params, searchParams }: PageAuthorProps) {
  const { id } = await params;
  const searchParamsData = await searchParams;
  const currentPage =
    typeof searchParamsData.page === 'string' ? Number.parseInt(searchParamsData.page, 10) : 1;
  const currentFilter =
    typeof searchParamsData.filter === 'string' ? searchParamsData.filter : 'جدیدترین';

  const authorResult = await getAuthorById(id);
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
    <div className="nc-PageAuthor bg-neutral-50 dark:bg-neutral-900">
      <AuthorProfile author={author} />

      <div className="container py-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <AuthorContent
          initialPosts={postsResult.data?.posts || []}
          totalPages={postsResult.data?.pages || 1}
          authorId={author.id}
          initialPage={currentPage}
          initialFilter={currentFilter}
        />

        <Suspense fallback={<CategorySkeleton />}>
          <DynamicCategories
            initialCategories={categoriesResult.data?.categories || []}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
        </Suspense>

        <Suspense fallback={<AuthorsSkeleton />}>
          <SectionSliderNewAuthors
            heading="قلم‌های برتر"
            subHeading="با ذهن‌های خلاق پشت مقالات ما آشنا شوید"
            authors={topAuthorsResult || []}
            itemPerRow={4}
          />
        </Suspense>

        <SectionSubscribe2 />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array(10)
          .fill(0)
          .map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
      </div>
    </div>
  );
}

function AuthorsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-32 w-32 rounded-full mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
      </div>
    </div>
  );
}
