import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  FolderOpen, 
  Tag, 
  Clock,
  Flame,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FiFilter } from 'react-icons/fi';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { IoClose } from 'react-icons/io5';
import { BsFolder2Open, BsTag } from 'react-icons/bs';
import { IoTimeOutline } from 'react-icons/io5';
import Link from 'next/link';

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
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [type, category, subcategory] = slug || [];
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
  { name: 'همه مقالات', className: 'text-center' },
  { name: 'جدیدترین' },
  { name: 'قدیمی‌ترین' },
  { name: 'محبوب‌ترین' },
];

type PageArchiveProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{
    page?: string;
    filter?: string;
  }>;
};

export default async function PageArchive({ params, searchParams }: PageArchiveProps) {
  const { slug } = await params;
  const searchParamsData = await searchParams;
  const [type, category, subcategory] = slug || [];
  const currentPage = searchParamsData.page ? Number.parseInt(searchParamsData.page) : 1;
  const filter = searchParamsData.filter || FILTERS[0].name;
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
      {/* Breadcrumb */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/80 dark:border-gray-700/80">
        <div className="container mx-auto px-1">
          <nav className="flex py-2" aria-label="مسیر">
            <ol className="flex flex-wrap items-center gap-0.5 min-w-0">
              {/* خانه */}
              <li>
                <Link 
                  href="/"
                  className="group flex items-center gap-1 px-1.5 py-1 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary text-xs sm:text-sm"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="sr-only">خانه</span>
                  <span className="block absolute h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ bottom: '-2px', left: '0px', right: '0px' }} />
                </Link>
              </li>

              {/* آرشیو */}
              <li>
                <div className="flex items-center">
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  <Link
                    href="/archive"
                    className="group px-1.5 py-1 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary text-xs sm:text-sm relative"
                  >
                    آرشیو
                    <span className="block absolute h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ bottom: '-2px', left: '0px', right: '0px' }} />
                  </Link>
                </div>
              </li>

              {/* نوع (دسته‌بندی/برچسب) */}
              {type && (
                <li>
                  <div className="flex items-center">
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <Link
                      href={type === 'category' ? '/archive/category' : '/archive/tag'}
                      className="group px-1.5 py-1 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary text-xs sm:text-sm relative whitespace-nowrap"
                    >
                      {type === 'category' ? 'دسته‌بندی' : 'برچسب'}
                      <span className="block absolute h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ bottom: '-2px', left: '0px', right: '0px' }} />
                    </Link>
                  </div>
                </li>
              )}

              {/* دسته‌بندی */}
              {selectedCategory && (
                <li>
                  <div className="flex items-center">
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <Link
                      href={`/archive/category/${selectedCategory.slug}`}
                      className="group px-1.5 py-1 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary text-xs sm:text-sm relative truncate max-w-[120px]"
                    >
                      {selectedCategory.name}
                      <span className="block absolute h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{ bottom: '-2px', left: '0px', right: '0px' }} />
                    </Link>
                  </div>
                </li>
              )}

              {/* زیردسته */}
              {selectedSubcategory && (
                <li>
                  <div className="flex items-center">
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <span className="px-1.5 py-1 text-gray-900 dark:text-white font-medium truncate max-w-[120px] text-xs sm:text-sm">
                      {selectedSubcategory.name}
                    </span>
                  </div>
                </li>
              )}

              {/* برچسب */}
              {selectedTag && (
                <li>
                  <div className="flex items-center">
                    <ChevronLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <span className="px-1.5 py-1 text-gray-900 dark:text-white font-medium truncate max-w-[120px] text-xs sm:text-sm">
                      {selectedTag.name}
                    </span>
                  </div>
                </li>
              )}
            </ol>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-1 sm:px-2 lg:px-3 mt-2">
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800/95 shadow-lg">
          {/* Mobile Layout */}
          <div className="md:hidden">
            <div className="relative w-full aspect-[16/9] overflow-hidden">
              <Image
                src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                alt={selectedCategory?.name || selectedTag?.name || 'تصویر مقالات'}
                fill
                sizes="100vw"
                className="object-contain bg-gray-100 dark:bg-gray-900"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
            
            <div className="relative px-4 -mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                {/* عنوان اصلی */}
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2">
                  {selectedSubcategory
                    ? selectedSubcategory.name
                    : selectedCategory
                      ? selectedCategory.name
                      : selectedTag
                        ? `مطالب مرتبط با ${selectedTag.name}`
                        : 'همه مطالب'}
                </h1>

                {/* توضیحات */}
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                  {selectedSubcategory
                    ? `مطالب مربوط به ${selectedSubcategory.name}`
                    : selectedCategory
                      ? `مجموعه مطالب ${selectedCategory.name}`
                      : selectedTag
                        ? `مطالبی که با ${selectedTag.name} برچسب‌گذاری شده‌اند`
                        : 'همه مطالب و محتوای سایت در یک نگاه'}
                </p>

                <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                  {/* نوع محتوا */}
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                    {selectedCategory ? (
                      <BsFolder2Open className="w-4 h-4 flex-shrink-0" />
                    ) : selectedTag ? (
                      <BsTag className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="font-medium">
                      {selectedCategory ? 'دسته‌بندی' : selectedTag ? 'برچسب' : 'همه مطالب'}
                    </span>
                  </span>

                  {/* تعداد مقالات */}
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{total} مقاله</span>
                  </span>

                  {/* زیرگروه‌ها */}
                  {!subcategory && selectedCategory?.childCategories && selectedCategory.childCategories.length > 0 && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                      <BsFolder2Open className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{selectedCategory.childCategories.length} زیرگروه</span>
                    </span>
                  )}

                  {/* آخرین بروزرسانی */}
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                    <IoTimeOutline className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">آخرین بروزرسانی: امروز</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block">
            <div className="flex p-6 gap-6">
              <div className="shrink-0">
                <div className="w-28 h-28 relative rounded-lg overflow-hidden">
                  <Image
                    src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                    alt={selectedCategory?.name || selectedTag?.name || 'تصویر مقالات'}
                    fill
                    sizes="(min-width: 768px) 112px"
                    className="object-cover"
                  />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                  {selectedSubcategory
                    ? selectedSubcategory.name
                    : selectedCategory
                      ? selectedCategory.name
                      : selectedTag
                        ? `مطالب مرتبط با ${selectedTag.name}`
                        : 'همه مطالب'}
                </h1>

                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                  {selectedSubcategory
                    ? `مطالب مربوط به ${selectedSubcategory.name}`
                    : selectedCategory
                      ? `مجموعه مطالب ${selectedCategory.name}`
                      : selectedTag
                        ? `مطالبی که با ${selectedTag.name} برچسب‌گذاری شده‌اند`
                        : 'همه مطالب و محتوای سایت در یک نگاه'}
                </p>

                <div className="flex flex-wrap gap-2 text-sm">
                  {/* نوع محتوا */}
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                    {selectedCategory ? (
                      <BsFolder2Open className="w-4 h-4 flex-shrink-0" />
                    ) : selectedTag ? (
                      <BsTag className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="font-medium">
                      {selectedCategory ? 'دسته‌بندی' : selectedTag ? 'برچسب' : 'همه مطالب'}
                    </span>
                  </span>

                  {/* تعداد مقالات */}
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{total} مقاله</span>
                  </span>

                  {/* زیرگروه‌ها */}
                  {!subcategory && selectedCategory?.childCategories && selectedCategory.childCategories.length > 0 && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                      <BsFolder2Open className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{selectedCategory.childCategories.length} زیرگروه</span>
                    </span>
                  )}

                  {/* آخرین بروزرسانی */}
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary-600 dark:text-primary-400 rounded-lg border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                    <IoTimeOutline className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">آخرین بروزرسانی: امروز</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-1 sm:px-2 lg:px-3 py-2 sm:py-4 lg:py-6 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Desktop View */}
        <div className="hidden md:flex md:flex-row md:items-center md:justify-between mb-6 sm:mb-8">
          <div className="flex flex-row space-x-2.5 rtl:space-x-reverse">
            <ModalCategories initialCategories={categories} />
            <ModalTags initialTags={tags} />
          </div>
          <div>
            <ArchiveFilterListBox filters={FILTERS} initialFilter={filter} />
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden fixed bottom-4 left-4 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <FiFilter className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-full sm:w-[380px] bg-background/20 backdrop-blur-xl border-0 rtl [&>button]:hidden"
            >
              <div className="h-full flex flex-col">
                <SheetHeader className="mb-6 px-6 pt-6">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-2xl font-bold">فیلترها</SheetTitle>
                    <SheetClose className="h-10 w-10 rounded-full hover:bg-white/10 inline-flex items-center justify-center">
                      <IoClose className="h-5 w-5" />
                    </SheetClose>
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-auto px-6">
                  <div className="space-y-6">
                    <div className="filter-section">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">دسته‌بندی‌ها</h3>
                        <span className="text-sm text-muted-foreground/70">انتخاب کنید</span>
                      </div>
                      <div className="bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl p-4 shadow-sm text-center">
                        <ModalCategories initialCategories={categories} />
                      </div>
                    </div>

                    <div className="filter-section">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">برچسب‌ها</h3>
                        <span className="text-sm text-muted-foreground/70">انتخاب کنید</span>
                      </div>
                      <div className="bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl p-4 shadow-sm text-center">
                        <ModalTags initialTags={tags} />
                      </div>
                    </div>

                    <div className="filter-section pb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">مرتب‌سازی</h3>
                        <span className="text-sm text-muted-foreground/70">{filter}</span>
                      </div>
                      <div className="bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl p-4 shadow-sm text-center">
                        <ArchiveFilterListBox filters={FILTERS} initialFilter={filter} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
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
  );
}
