import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import Pagination from '@/components/Pagination/Pagination';
import ButtonSecondary from '@/components/Button/ButtonSecondary';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import Card11 from '@/components/Card11/Card11';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import SectionGridCategoryBox from '@/components/SectionGridCategoryBox/SectionGridCategoryBox';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import { getArchivePosts } from '@/actions/postActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';
import type { PostWithRelations, TaxonomyType } from '@/types/types';
import ModalCategories from '@/app/(site)/(archives)/ModalCategories';
import ModalTags from '@/app/(site)/(archives)/ModalTags';
import ArchiveFilterListBoxClient from '@/app/(site)/(archives)/ArchiveFilterListBoxClient';

export const metadata: Metadata = {
  title: 'گنجینه مقالات | دنیای دانش و الهام',
  description: 'کاوش در مجموعه گسترده مقالات ما: از علم تا هنر، از فناوری تا فلسفه',
};

const FILTERS = [
  { name: 'همه مقالات' },
  { name: 'جدیدترین' },
  { name: 'قدیمی‌ترین' },
  { name: 'محبوب‌ترین' },
];

function getDataOrDefault<T>(result: { success: boolean; data?: T }, defaultValue: T): T {
  return result.success ? result.data ?? defaultValue : defaultValue;
}

export default async function PageArchive({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; tag?: string; filter?: string };
}) {
  const currentPage = searchParams.page ? Number.parseInt(searchParams.page) : 1;
  const limit = 12;
  const categoryId = searchParams.category;
  const tagId = searchParams.tag;
  const filter = searchParams.filter || FILTERS[0].name;

  const [postsResult, categoriesResult, tagsResult] = await Promise.all([
    getArchivePosts(currentPage, limit, filter, categoryId, tagId),
    getCategories({ limit: 10 }),

    getTags(10),
    getTopAuthors(10),
  ]);

  const { posts, total, pages } = getDataOrDefault(postsResult, { posts: [], total: 0, pages: 0 });
  const { categories, totalCount: totalCategories } = getDataOrDefault(categoriesResult, {
    categories: [],
    totalCount: 0,
  });
  const { tags } = getDataOrDefault(tagsResult, { tags: [], totalCount: 0 });
  const topAuthorsResult = await getTopAuthors(10);
  const topAuthors = Array.isArray(topAuthorsResult) ? topAuthorsResult : [];

  return (
    <div className="nc-PageArchive">
      {/* سرصفحه جذاب */}
      <div className="w-full px-2 xl:max-w-screen-2xl mx-auto">
        <div className="relative aspect-w-16 aspect-h-13 sm:aspect-h-9 lg:aspect-h-8 xl:aspect-h-5 rounded-3xl md:rounded-[40px] overflow-hidden z-0">
          <Image
            alt="دروازه دانش"
            fill
            src="https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260"
            className="object-cover w-full h-full rounded-3xl md:rounded-[40px]"
            sizes="(max-width: 1280px) 100vw, 1536px"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black text-white bg-opacity-30 flex flex-col items-center justify-center">
            <h1 className="inline-block align-middle text-5xl font-bold md:text-7xl">
              گنجینه مقالات
            </h1>
            <p className="block mt-4 text-xl text-neutral-200">
              کاوش در {total} مقاله الهام‌بخش و آموزنده
            </p>
          </div>
        </div>
      </div>

      <div className="container pt-10 pb-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <div>
          <div className="flex flex-col sm:justify-between sm:flex-row">
            <div className="flex space-x-2.5 rtl:space-x-reverse">
              <ModalCategories categories={categories} />
              <ModalTags tags={tags} />
            </div>
            <div className="block my-4 border-b w-full border-neutral-300 dark:border-neutral-500 sm:hidden" />
            <div className="flex justify-end">
              <ArchiveFilterListBoxClient
                filters={FILTERS}
                initialFilter={filter}
                searchParams={searchParams}
              />
            </div>
          </div>

          {/* گالری مقالات */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mt-8 lg:mt-10">
            {posts.map((post: PostWithRelations) => (
              <Card11 key={post.id} post={post} />
            ))}
          </div>

          {/* صفحه‌بندی هوشمند */}
          <div className="flex flex-col mt-12 lg:mt-16 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
            <Pagination currentPage={currentPage} totalPages={pages} />
          </div>
        </div>

        {/* بخش‌های تکمیلی */}
        <div className="relative py-16">
          <BackgroundSection />
          <SectionGridCategoryBox
            categories={categories}
            headingCenter={true}
            totalCount={totalCategories}
          />
          <div className="text-center mx-auto mt-10 md:mt-16">
            <Link href="/categories">
              <ButtonSecondary>کشف دنیاهای جدید</ButtonSecondary>
            </Link>
          </div>
        </div>

        {/* معرفی نویسندگان برجسته */}
        <SectionSliderNewAuthors
          heading="قلم‌های برتر"
          subHeading="با ذهن‌های خلاق پشت مقالات ما آشنا شوید"
          authors={topAuthors}
          itemPerRow={4}
        />

        {/* دعوت به اشتراک */}
        <SectionSubscribe2 />
      </div>
    </div>
  );
}
