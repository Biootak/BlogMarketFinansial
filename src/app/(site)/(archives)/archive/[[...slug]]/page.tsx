import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlFire } from 'react-icons/sl';

import { getArchivePosts } from '@/actions/postActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';
import Image from 'next/image';
import ModalCategories from '../../ModalCategories';
import ModalTags from '../../ModalTags';
import ArchiveFilterListBox from '@/components/ArchiveFilterListBox/ArchiveFilterListBox';
import AnimatedPostGrid from '../../AnimatedPostGrid';
import Pagination from '@/components/Pagination/Pagination';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import DynamicCategories from '@/components/DynamicCategories';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import Empty from '@/components/Empty';

export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}): Promise<Metadata> {
  const [type, category, subcategory] = params.slug || [];
  let title = 'گنجینه مقالات | دنیای دانش و الهام';
  let description = 'کاوش در مجموعه گسترده مقالات ما: از علم تا هنر، از فناوری تا فلسفه';

  if (type === 'category') {
    if (subcategory) {
      title = `مقالات ${subcategory} در دسته‌بندی ${category} | ${title}`;
      description = `مطالب مرتبط با ${subcategory} در دسته‌بندی ${category}`;
    } else {
      title = `مقالات دسته‌بندی ${category} | ${title}`;
      description = `مطالب مرتبط با دسته‌بندی ${category}`;
    }
  } else if (type === 'tag') {
    title = `مقالات با برچسب ${category} | ${title}`;
    description = `مطالب مرتبط با برچسب ${category}`;
  }

  return {
    title,
    description,
  };
}

const FILTERS = [
  { name: 'همه مقالات' },
  { name: 'جدیدترین' },
  { name: 'قدیمی‌ترین' },
  { name: 'محبوب‌ترین' },
];

type PageArchiveProps = {
  params: { slug?: string[] };
  searchParams: {
    page?: string;
    filter?: string;
  };
};

export default async function PageArchive({ params, searchParams }: PageArchiveProps) {
  const [type, category, subcategory] = params.slug || [];
  const currentPage = searchParams.page ? Number.parseInt(searchParams.page) : 1;
  const filter = searchParams.filter || FILTERS[0].name;
  const limit = 12;

  if (type && !['category', 'tag'].includes(type)) {
    notFound();
  }

  const [postsResult, categoriesResult, tagsResult, topAuthorsResult] = await Promise.all([
    getArchivePosts(
      currentPage,
      limit,
      filter,
      type === 'category' ? category : undefined,
      subcategory,
      type === 'tag' ? category : undefined,
    ),
    getCategories({ limit: 10, page: 1 }),
    getTags({ limit: 10, page: 1 }),
    getTopAuthors(5),
  ]);

  const { posts, total, pages } = postsResult.data || { posts: [], total: 0, pages: 0 };
  const categories = categoriesResult.data?.categories || [];
  const tags = tagsResult.data?.tags || [];
  const topAuthors = topAuthorsResult || [];

  const selectedCategory =
    type === 'category' ? categories.find((cat) => cat.slug === category) : null;
  const selectedSubcategory = subcategory
    ? selectedCategory?.childCategories?.find((sub) => sub.slug === subcategory)
    : null;
  const selectedTag = type === 'tag' ? tags.find((tag) => tag.slug === category) : null;

  const defaultImage = '/images/crypto/crypto.png';

  return (
    <div className="nc-PageArchive max-w-full overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10 lg:mt-12">
        <Card className="overflow-hidden bg-white dark:bg-gray-800 shadow-lg">
          <div className="flex flex-col md:flex-row items-center p-4 sm:p-6 md:p-8">
            <div className="mb-6 md:mb-0 md:ml-8">
              <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 overflow-hidden rounded-lg relative">
                <Image
                  src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                  alt={selectedCategory?.name || selectedTag?.name || 'تصویر مقالات'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </div>
            <div className="flex-1 md:ml-4 text-center md:text-right">
              <CardHeader className="p-0 mb-2 sm:mb-4">
                <CardTitle className="text-2xl sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedSubcategory?.name ||
                    selectedCategory?.name ||
                    selectedTag?.name ||
                    'گنجینه مقالات'}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
                  {selectedSubcategory
                    ? `مطالب مرتبط با ${selectedSubcategory.name} در دسته‌بندی ${selectedCategory?.name}`
                    : selectedCategory
                      ? `مجموعه مقالات مرتبط با ${selectedCategory.name}`
                      : selectedTag
                        ? `مطالب مرتبط با برچسب ${selectedTag.name}`
                        : 'کاوش در دنیای دانش و ایده‌های نو'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex items-center justify-center md:justify-start text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-200">
                  <SlFire className="ml-2 text-orange-500" />
                  <span>{total} مقاله</span>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-8 sm:space-y-12 lg:space-y-16">
        <div>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6 sm:mb-8">
            <div className="flex flex-col w-full space-y-2 md:flex-row md:w-auto md:space-y-0 md:space-x-2.5 rtl:space-x-reverse">
              <div className="w-full md:w-auto">
                <ModalCategories initialCategories={categories} />
              </div>
              <div className="w-full md:w-auto">
                <ModalTags initialTags={tags} />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <ArchiveFilterListBox filters={FILTERS} initialFilter={filter} />
            </div>
          </div>

          {posts.length > 0 ? <AnimatedPostGrid posts={posts} /> : <Empty />}

          {posts.length > 0 && (
            <div className="flex flex-col mt-8 sm:mt-10 lg:mt-12 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
              <Pagination currentPage={currentPage} totalPages={pages} />
            </div>
          )}
        </div>

        <div className="relative py-12 sm:py-16">
          <BackgroundSection />
          <DynamicCategories
            initialCategories={categories}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
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
