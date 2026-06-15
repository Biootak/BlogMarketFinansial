import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  FileText,
  Home,
  Sparkles,
  TrendingUp,
  Calendar,
  Layers,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { BsFolder2Open, BsTag } from 'react-icons/bs';
import Link from 'next/link';

import { getArchivePosts } from '@/actions/postActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getActiveAdvertisements } from '@/actions/advertisementActions';
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
import ArchiveSearchInput from '../../ArchiveSearchInput';

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
    q?: string;
  }>;
};

export default async function PageArchive({ params, searchParams }: PageArchiveProps) {
  const { slug } = await params;
  const searchParamsData = await searchParams;
  const [type, category, subcategory] = slug || [];
  const currentPage = searchParamsData.page ? Number.parseInt(searchParamsData.page) : 1;
  const filter = searchParamsData.filter || FILTERS[0].name;
  const searchQuery = searchParamsData.q || '';
  const limit = 12;

  if (type && !['category', 'tag'].includes(type)) {
    notFound();
  }

  const [postsResult, categoriesResult, tagsResult, topAuthorsResult, betweenPostsAdsResult] = await Promise.all([
    getArchivePosts(
      currentPage,
      limit,
      filter,
      type === 'category' ? category : undefined,
      subcategory,
      type === 'tag' ? category : undefined,
      searchQuery,
    ),
    getCategories({ limit: 10, page: 1 }),
    getTags({ limit: 10, page: 1 }),
    getTopAuthors(5),
    getActiveAdvertisements({
      limit: 1,
      position: 'BETWEEN_POSTS',
      orderBy: 'createdAt',
      orderDirection: 'desc',
    }),
  ]);

  const { posts, total, pages } = postsResult.data || { posts: [], total: 0, pages: 0 };
  const categories = categoriesResult.data?.categories || [];
  const tags = tagsResult.data?.tags || [];
  const topAuthors = topAuthorsResult || [];
  const betweenPostsAd = betweenPostsAdsResult.success && betweenPostsAdsResult.data?.[0] ? betweenPostsAdsResult.data[0] : null;

  const selectedCategory =
    type === 'category' ? categories.find((cat) => cat.slug === category) : null;
  const selectedSubcategory = subcategory
    ? selectedCategory?.childCategories?.find((sub) => sub.slug === subcategory)
    : null;
  const selectedTag = type === 'tag' ? tags.find((tag) => tag.slug === category) : null;

  const defaultImage = '/images/crypto/crypto.png';

  return (
    <div className="nc-PageArchive max-w-full @container/archive @md/archive:overflow-x-visible">
      {/* Premium Breadcrumb */}
      <div className="sticky top-0 z-20 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="container">
          <nav className="flex py-3" aria-label="مسیر">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link 
                  href="/"
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 text-sm font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">خانه</span>
                </Link>
              </li>

              <li className="flex items-center">
                <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                <Link
                  href="/archive"
                  className="px-2.5 py-1.5 text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 text-sm font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
                >
                  آرشیو
                </Link>
              </li>

              {type && (
                <li className="flex items-center">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                  <Link
                    href={type === 'category' ? '/archive/category' : '/archive/tag'}
                    className="px-2.5 py-1.5 text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 text-sm font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
                  >
                    {type === 'category' ? 'دسته‌بندی' : 'برچسب'}
                  </Link>
                </li>
              )}

              {selectedCategory && (
                <li className="flex items-center min-w-0">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  <Link
                    href={`/archive/category/${selectedCategory.slug}`}
                    className="px-2.5 py-1.5 text-neutral-700 dark:text-neutral-200 text-sm font-semibold rounded-lg bg-primary-50 dark:bg-primary-900/30 truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[18rem]"
                  >
                    {selectedCategory.name}
                  </Link>
                </li>
              )}

              {selectedSubcategory && (
                <li className="flex items-center min-w-0">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  <span className="px-2.5 py-1.5 text-primary-600 dark:text-primary-400 text-sm font-semibold bg-primary-100 dark:bg-primary-900/50 rounded-lg truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[18rem]">
                    {selectedSubcategory.name}
                  </span>
                </li>
              )}

              {selectedTag && (
                <li className="flex items-center min-w-0">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  <span className="px-2.5 py-1.5 text-primary-600 dark:text-primary-400 text-sm font-semibold bg-primary-100 dark:bg-primary-900/50 rounded-lg truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[18rem]">
                    {selectedTag.name}
                  </span>
                </li>
              )}
            </ol>
          </nav>
        </div>
      </div>

      {/* Premium Hero Section */}
      <div className="container mt-4 sm:mt-6 mb-6 sm:mb-8 px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-neutral-50 to-primary-50/30 dark:from-neutral-900 dark:via-neutral-800 dark:to-primary-900/20 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-neutral-200/60 dark:border-neutral-700/60">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-48 sm:w-72 h-48 sm:h-72 bg-primary-400/10 dark:bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-primary-300/10 dark:bg-primary-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
          
          <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:gap-10 p-4 sm:p-6 md:p-10">
            {/* Image Container */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl sm:rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl sm:rounded-2xl overflow-hidden ring-2 sm:ring-4 ring-white/80 dark:ring-neutral-800/80 shadow-xl">
                <Image
                  src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                  alt={selectedCategory?.name || selectedTag?.name || 'تصویر مقالات'}
                  fill
                  sizes="(min-width: 768px) 160px, (min-width: 640px) 128px, 96px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  priority
                />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-1.5 sm:-bottom-2 -right-1.5 sm:-right-2 bg-primary-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg shadow-primary-500/30">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline-block ml-0.5 sm:ml-1" />
                {total} مقاله
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 text-center md:text-right">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full text-[10px] sm:text-xs font-semibold mb-2 sm:mb-4">
                {selectedCategory ? (
                  <><BsFolder2Open className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> دسته‌بندی</>
                ) : selectedTag ? (
                  <><BsTag className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> برچسب</>
                ) : (
                  <><FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> آرشیو کامل</>
                )}
              </div>
              
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-neutral-900 dark:text-white leading-tight mb-2 sm:mb-3">
                {selectedSubcategory
                  ? selectedSubcategory.name
                  : selectedCategory
                    ? selectedCategory.name
                    : selectedTag
                      ? selectedTag.name
                      : 'همه مطالب'}
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 sm:mb-6 max-w-xl mx-auto md:mx-0">
                {selectedSubcategory
                  ? `جدیدترین و بهترین مطالب در حوزه ${selectedSubcategory.name}`
                  : selectedCategory
                    ? `مجموعه‌ای از بهترین مقالات ${selectedCategory.name}`
                    : selectedTag
                      ? `تمام مطالب مرتبط با ${selectedTag.name}`
                      : 'کاوش در دنیای دانش و اطلاعات مالی'}
              </p>

              {/* Stats Pills */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3">
                <div className="group flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-neutral-800 rounded-lg sm:rounded-xl shadow-sm border border-neutral-200/80 dark:border-neutral-700/80 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm">
                    <FileText className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-white" />
                  </div>
                  <div className="text-right">
                    <span className="block text-base sm:text-lg font-bold text-neutral-900 dark:text-white">{total}</span>
                    <span className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">مقاله</span>
                  </div>
                </div>

                {!subcategory && selectedCategory?.childCategories && selectedCategory.childCategories.length > 0 && (
                  <div className="group flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-neutral-800 rounded-lg sm:rounded-xl shadow-sm border border-neutral-200/80 dark:border-neutral-700/80 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                      <Layers className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-white" />
                    </div>
                    <div className="text-right">
                      <span className="block text-base sm:text-lg font-bold text-neutral-900 dark:text-white">{selectedCategory.childCategories.length}</span>
                      <span className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">زیرگروه</span>
                    </div>
                  </div>
                )}

                <div className="group flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-neutral-800 rounded-lg sm:rounded-xl shadow-sm border border-neutral-200/80 dark:border-neutral-700/80 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                    <Calendar className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-white" />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">امروز</span>
                    <span className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">آخرین بروزرسانی</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Filter Bar */}
      <div className="container mb-8">
        {/* Search Input */}
        <div className="mb-4">
          <Suspense fallback={<div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />}>
            <ArchiveSearchInput initialQuery={searchQuery} />
          </Suspense>
          {searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">نتایج جستجو برای:</span>
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium">
                {searchQuery}
              </span>
              <Link
                href="/archive"
                className="text-xs text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                پاک کردن
              </Link>
            </div>
          )}
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800/80 rounded-2xl shadow-sm border border-neutral-200/60 dark:border-neutral-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 pl-4 border-l border-neutral-200 dark:border-neutral-700">
                <Filter className="w-5 h-5 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">فیلتر:</span>
              </div>
              <div className="flex gap-2">
                <ModalCategories initialCategories={categories} />
                <ModalTags initialTags={tags} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">مرتب‌سازی:</span>
              <ArchiveFilterListBox filters={FILTERS} initialFilter={filter} />
            </div>
          </div>
        </div>

        {/* Mobile Filter FAB */}
        <div className="md:hidden fixed bottom-6 left-6 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                size="lg"
                className="h-14 w-14 rounded-full shadow-xl shadow-primary-500/30 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 border-0"
              >
                <Filter className="w-5 h-5 text-white" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-full sm:w-[400px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border-0 rtl [&>button]:hidden p-0"
            >
              <div className="h-full flex flex-col">
                <SheetHeader className="px-6 pt-8 pb-6 border-b border-neutral-200/80 dark:border-neutral-700/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <SheetTitle className="text-2xl font-bold text-neutral-900 dark:text-white">فیلترها</SheetTitle>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">نتایج را محدود کنید</p>
                    </div>
                    <SheetClose className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 inline-flex items-center justify-center transition-colors">
                      <X className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                    </SheetClose>
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-auto px-6 py-6">
                  <div className="space-y-8">
                    {/* Categories Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                          <BsFolder2Open className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">دسته‌بندی‌ها</h3>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200/60 dark:border-neutral-700/60">
                        <ModalCategories initialCategories={categories} />
                      </div>
                    </div>

                    {/* Tags Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                          <BsTag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">برچسب‌ها</h3>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200/60 dark:border-neutral-700/60">
                        <ModalTags initialTags={tags} />
                      </div>
                    </div>

                    {/* Sort Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">مرتب‌سازی</h3>
                        <span className="mr-auto text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded-full">{filter}</span>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200/60 dark:border-neutral-700/60">
                        <ArchiveFilterListBox filters={FILTERS} initialFilter={filter} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="container">
        {posts.length > 0 ? <AnimatedPostGrid posts={posts} betweenPostsAd={betweenPostsAd} /> : <Empty />}

        {posts.length > 0 && (
          <div className="flex justify-center mt-12 mb-8">
            <Pagination currentPage={currentPage} totalPages={pages} />
          </div>
        )}
      </div>

      <div className="relative py-12 sm:py-16">
        <BackgroundSection />
        <div className="container relative z-10">
          <DynamicCategories
            initialCategories={categories}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
        </div>
      </div>

      <div className="container py-12 sm:py-16">
        <SectionSliderNewAuthors
          heading="قلم‌های برتر"
          subHeading="با ذهن‌های خلاق پشت مقالات ما آشنا شوید"
          authors={topAuthors}
          itemPerRow={5}
        />
      </div>

      <SectionSubscribe2 />
    </div>
  );
}
