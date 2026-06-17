import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Home, ChevronLeft, ArrowLeft } from 'lucide-react';

import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getArchivePosts } from '@/actions/postActions';
import Pagination from '@/components/Pagination/Pagination';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import DynamicCategories from '@/components/DynamicCategories';
import Empty from '@/components/Empty';
import ArchiveHero from '../../ArchiveHero';
import FilterRail from '../../FilterRail';
import MobileFilterSheet from '../../MobileFilterSheet';
import ActiveFilters, { type ActiveFilter } from '../../ActiveFilters';
import AnimatedPostGridV3 from '../../AnimatedPostGridV3';

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
  { name: 'همه مقالات' },
  { name: 'جدیدترین' },
  { name: 'قدیمی‌ترین' },
  { name: 'محبوب‌ترین' },
];

const DEFAULT_FILTER = FILTERS[0].name;

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
  const filter = searchParamsData.filter || DEFAULT_FILTER;
  const searchQuery = searchParamsData.q || '';
  const limit = 12;

  if (type && !['category', 'tag'].includes(type)) {
    notFound();
  }

  const [postsResult, categoriesResult, tagsResult, topAuthorsResult, betweenPostsAdsResult] =
    await Promise.all([
      getArchivePosts(
        currentPage,
        limit,
        filter,
        type === 'category' ? category : undefined,
        subcategory,
        type === 'tag' ? category : undefined,
        searchQuery,
      ),
      getCategories({ limit: 12, page: 1 }),
      getTags({ limit: 12, page: 1 }),
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
  const betweenPostsAd =
    betweenPostsAdsResult.success && betweenPostsAdsResult.data?.[0]
      ? betweenPostsAdsResult.data[0]
      : null;

  const selectedCategory =
    type === 'category' ? categories.find((cat) => cat.slug === category) : null;
  const selectedSubcategory = subcategory
    ? selectedCategory?.childCategories?.find((sub) => sub.slug === subcategory)
    : null;
  const selectedTag = type === 'tag' ? tags.find((tag) => tag.slug === category) : null;

  const defaultImage = '/images/crypto/crypto.png';

  const quickPickCategories = categories.slice(0, 4);
  const trendingTags = tags.slice(0, 6);

  // ساخت لیست فیلترهای فعال برای نمایش
  const activeFilters: ActiveFilter[] = [];
  if (searchQuery) {
    activeFilters.push({
      type: 'q',
      label: `«${searchQuery}»`,
      href: '/archive',
      icon: 'search',
    });
  }
  if (selectedCategory) {
    activeFilters.push({
      type: 'category',
      label: selectedCategory.name,
      href: subcategory ? `/archive/category/${selectedCategory.slug}` : '/archive',
      icon: 'category',
      variant: 'primary',
    });
  }
  if (selectedSubcategory) {
    activeFilters.push({
      type: 'subcategory',
      label: selectedSubcategory.name,
      href: selectedCategory ? `/archive/category/${selectedCategory.slug}` : '/archive',
      icon: 'sort',
    });
  }
  if (selectedTag) {
    activeFilters.push({
      type: 'tag',
      label: `#${selectedTag.name}`,
      href: '/archive',
      icon: 'tag',
      variant: 'accent',
    });
  }
  if (filter && filter !== DEFAULT_FILTER) {
    activeFilters.push({
      type: 'filter',
      label: `مرتب‌سازی: ${filter}`,
      href: '/archive',
      icon: 'sort',
    });
  }

  return (
    <div className="nc-PageArchive max-w-full @container/archive @md/archive:overflow-x-visible">
      {/* ============================ Breadcrumb ============================ */}
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50">
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

              {type ? (
                <li className="flex items-center">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                  <Link
                    href={type === 'category' ? '/archive/category' : '/archive/tag'}
                    className="px-2.5 py-1.5 text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 text-sm font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
                  >
                    {type === 'category' ? 'دسته‌بندی' : 'برچسب'}
                  </Link>
                </li>
              ) : null}

              {selectedCategory ? (
                <li className="flex items-center min-w-0">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  <Link
                    href={`/archive/category/${selectedCategory.slug}`}
                    className="px-2.5 py-1.5 text-neutral-700 dark:text-neutral-200 text-sm font-semibold rounded-lg bg-primary-50 dark:bg-primary-900/30 truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[18rem]"
                  >
                    {selectedCategory.name}
                  </Link>
                </li>
              ) : null}

              {selectedSubcategory ? (
                <li className="flex items-center min-w-0">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  <span className="px-2.5 py-1.5 text-primary-600 dark:text-primary-400 text-sm font-semibold bg-primary-100 dark:bg-primary-900/50 rounded-lg truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[18rem]">
                    {selectedSubcategory.name}
                  </span>
                </li>
              ) : null}

              {selectedTag ? (
                <li className="flex items-center min-w-0">
                  <ChevronLeft className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                  <span className="px-2.5 py-1.5 text-primary-600 dark:text-primary-400 text-sm font-semibold bg-primary-100 dark:bg-primary-900/50 rounded-lg truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[18rem]">
                    {selectedTag.name}
                  </span>
                </li>
              ) : null}
            </ol>
          </nav>
        </div>
      </div>

      {/* ============================ Hero v3 ============================ */}
      <div className="container mt-4 sm:mt-6 mb-6 sm:mb-8">
        <ArchiveHero
          total={total}
          currentPage={currentPage}
          totalPages={pages}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          selectedTag={selectedTag}
          quickPickCategories={quickPickCategories}
          trendingTags={trendingTags}
          defaultImage={defaultImage}
        />
      </div>

      {/* ============================ Active filters ============================ */}
      {activeFilters.length > 0 ? (
        <div className="container mb-3">
          <ActiveFilters filters={activeFilters} totalCount={total} />
        </div>
      ) : null}

      {/* ============================ Filter rail (desktop) ============================ */}
      <div className="container mb-6 sm:mb-8 hidden md:block">
        <Suspense
          fallback={
            <div className="arc-rail-v3">
              <div className="arc-shimmer h-10 w-full" />
            </div>
          }
        >
          <FilterRail
            filters={FILTERS}
            initialFilter={filter}
            initialQuery={searchQuery}
            categories={categories}
            tags={tags}
            currentCategory={selectedCategory}
            currentTag={selectedTag}
            quickPickTags={trendingTags}
            showSuggestions={!selectedTag && !selectedCategory}
          />
        </Suspense>
      </div>

      {/* ============================ Mobile filter ============================ */}
      <div className="md:hidden">
        <MobileFilterSheet
          categories={categories}
          tags={tags}
          filters={FILTERS}
          initialFilter={filter}
          initialQuery={searchQuery}
          currentCategory={selectedCategory}
          currentTag={selectedTag}
          activeFilterCount={activeFilters.length}
        />
      </div>

      {/* ============================ Result meta ============================ */}
      {posts.length > 0 ? (
        <div className="container">
          <div className="arc-result-strip">
            <span className="arc-result-strip__count">
              نمایش{' '}
              <span className="arc-result-strip__num">
                {posts.length.toLocaleString('fa-IR')}
              </span>{' '}
              از{' '}
              <span className="arc-result-strip__num">
                {total.toLocaleString('fa-IR')}
              </span>{' '}
              مقاله
            </span>
            {pages > 1 ? (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
                صفحه {currentPage.toLocaleString('fa-IR')} از{' '}
                {pages.toLocaleString('fa-IR')}
              </span>
            ) : null}
            <span className="arc-result-strip__sep" aria-hidden />
          </div>
        </div>
      ) : null}

      {/* ============================ Posts grid ============================ */}
      <div className="container">
        {posts.length > 0 ? (
          <AnimatedPostGridV3 posts={posts} betweenPostsAd={betweenPostsAd} />
        ) : (
          <Empty />
        )}

        {posts.length > 0 && pages > 1 ? (
          <div className="flex justify-center mt-12 mb-8">
            <Pagination currentPage={currentPage} totalPages={pages} />
          </div>
        ) : null}

        {posts.length === 0 ? (
          <div className="flex justify-center mt-8 mb-8">
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              بازگشت به آرشیو
            </Link>
          </div>
        ) : null}
      </div>

      <div className="relative py-12 sm:py-16 arc-reveal">
        <BackgroundSection />
        <div className="container relative z-10">
          <DynamicCategories
            initialCategories={categories}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
        </div>
      </div>

      <div className="container py-12 sm:py-16 arc-reveal">
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
