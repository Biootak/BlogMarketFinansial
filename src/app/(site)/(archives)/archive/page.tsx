import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlFire } from 'react-icons/sl';

import { getArchivePosts } from '@/actions/postActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';

import ModalCategories from '../ModalCategories';
import ModalTags from '../ModalTags';
import ArchiveFilterListBox from '@/components/ArchiveFilterListBox/ArchiveFilterListBox';
import type { PostWithRelations, TaxonomyType } from '@/types/types';
import Card11 from '@/components/Card11/Card11';
import Pagination from '@/components/Pagination/Pagination';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import DynamicCategories from '@/components/DynamicCategories';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';

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

type PageArchiveProps = {
  searchParams: {
    page?: string;
    category?: string;
    tag?: string;
    filter?: string;
  };
};

async function getPageData(searchParams: PageArchiveProps['searchParams']) {
  const currentPage = searchParams.page ? Number.parseInt(searchParams.page) : 1;
  const limit = 12;
  const categoryId = searchParams.category;
  const tagId = searchParams.tag;
  const filter = searchParams.filter || FILTERS[0].name;

  const [postsResult, categoriesResult, tagsResult, topAuthorsResult] = await Promise.all([
    getArchivePosts(currentPage, limit, filter, categoryId, tagId),
    getCategories({ limit: 10, page: 1 }),
    getTags({ limit: 10, page: 1 }),
    getTopAuthors(10),
  ]);

  return {
    posts: postsResult.data?.posts || [],
    total: postsResult.data?.total || 0,
    pages: postsResult.data?.pages || 0,
    categories: categoriesResult.data?.categories || [],
    totalCategories: categoriesResult.data?.totalCount || 0,
    tags: tagsResult.data?.tags || [],
    topAuthors: topAuthorsResult || [],
  };
}

export default async function PageArchive({ searchParams }: PageArchiveProps) {
  const { posts, total, pages, categories, totalCategories, tags, topAuthors } =
    await getPageData(searchParams);

  const selectedCategory = searchParams.category
    ? categories.find((cat) => cat.id === searchParams.category)
    : null;
  const selectedTag = searchParams.tag ? tags.find((tag) => tag.id === searchParams.tag) : null;

  const defaultImage = '/images/hero-right-2.png';

  return (
    <div className="nc-PageArchive">
      <div className="container mt-10 px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden bg-white dark:bg-gray-800">
          <div className="flex flex-col md:flex-row items-center p-6 md:p-8">
            <div className="mb-6 md:mb-0 md:ml-8">
              <div className="w-48 h-48 overflow-hidden rounded-lg relative">
                <Image
                  src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                  alt={selectedCategory?.name || selectedTag?.name || 'تصویر مقالات'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  priority
                />
              </div>
            </div>
            <div className="flex-1 md:ml-4 text-center md:text-right">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedCategory?.name || selectedTag?.name || 'گنجینه مقالات'}
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
                  {selectedCategory
                    ? `مجموعه مقالات مرتبط با ${selectedCategory.name}`
                    : selectedTag
                      ? `مطالب مرتبط با برچسب ${selectedTag.name}`
                      : 'کاوش در دنیای دانش و ایده‌های نو'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex items-center justify-center md:justify-start text-2xl font-semibold text-gray-700 dark:text-gray-200">
                  <SlFire className="ml-2 text-orange-500" />
                  <span>{total} مقاله</span>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>

      <div className="container pt-10 pb-16 lg:pb-28 lg:pt-20 space-y-16 lg:space-y-28">
        <div>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-col w-full space-y-2 md:flex-row md:w-auto md:space-y-0 md:space-x-2.5 rtl:space-x-reverse">
              <div className="w-full md:w-auto">
                <ModalCategories initialCategories={categories} />
              </div>
              <div className="w-full md:w-auto">
                <ModalTags initialTags={tags} />
              </div>
            </div>
            <div className="w-full md:w-auto ">
              <ArchiveFilterListBox
                filters={FILTERS}
                initialFilter={searchParams.filter || FILTERS[0].name}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mt-8 lg:mt-10">
            {posts.map((post: PostWithRelations) => (
              <Card11 key={post.id} post={post} />
            ))}
          </div>

          <div className="flex flex-col mt-12 lg:mt-16 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
            <Pagination
              currentPage={searchParams.page ? Number.parseInt(searchParams.page) : 1}
              totalPages={pages}
            />
          </div>
        </div>

        <div className="relative py-16">
          <BackgroundSection />
          <DynamicCategories initialCategories={categories} initialTotalCount={totalCategories} />
        </div>

        <SectionSliderNewAuthors
          heading="قلم‌های برتر"
          subHeading="با ذهن‌های خلاق پشت مقالات ما آشنا شوید"
          authors={topAuthors}
          itemPerRow={5}
        />

        <SectionSubscribe2 />
      </div>
    </div>
  );
}
