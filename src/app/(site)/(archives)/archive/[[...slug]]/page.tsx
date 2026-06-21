import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getArchivePosts } from '@/actions/postActions';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
import BannerAds from '@/components/BannerADS/BannerADS';
import DynamicCategories from '@/components/DynamicCategories';
import Empty from '@/components/Empty';
import Pagination from '@/components/Pagination/Pagination';
import SectionSliderNewAuthors from '@/components/SectionSliderNewAthors/SectionSliderNewAuthors';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import type { ActiveFilter } from '../../_components/ActiveFilters';
import AtelierGrid from '../../_components/AtelierGrid';
import AtelierMasthead from '../../_components/AtelierMasthead';
import AtelierToolbar from '../../_components/AtelierToolbar';
import { buildArchiveCrumbs } from '../../_components/buildArchiveCrumbs';

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

  return { title, description };
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

  const quickPickCategories = categories.slice(0, 5);

  // ---- Masthead copy (context-aware) ----
  const mastheadTitle = selectedSubcategory
    ? selectedSubcategory.name
    : selectedCategory
      ? selectedCategory.name
      : selectedTag
        ? `#${selectedTag.name}`
        : 'گنجینه مقالات';

  const mastheadKicker = selectedSubcategory
    ? 'زیرمجموعه'
    : selectedCategory
      ? 'دسته‌بندی'
      : selectedTag
        ? 'برچسب'
        : 'آرشیو زنده و به‌روز';

  const mastheadIndex = selectedCategory
    ? `دسته‌بندی · ${selectedCategory.name}`
    : selectedTag
      ? 'مرور بر اساس برچسب'
      : 'مجموعه‌ی کامل مقالات';

  const mastheadLead = selectedSubcategory
    ? `تازه‌ترین تحلیل‌ها و یادداشت‌های تخصصی در ${selectedSubcategory.name}.`
    : selectedCategory
      ? `مجموعه‌ای گزینش‌شده از مقالات ${selectedCategory.name} — از تحلیل تا آموزش.`
      : selectedTag
        ? `هر آنچه درباره‌ی «${selectedTag.name}» نوشته‌ایم، یکجا و دسته‌بندی‌شده.`
        : 'از بازارهای مالی تا فناوری و اقتصاد کلان؛ یک اتاق مطالعه‌ی آرام برای کاوش عمیق.';

  // ---- Active filters ----
  const activeFilters: ActiveFilter[] = [];
  if (searchQuery) {
    activeFilters.push({ type: 'q', label: `«${searchQuery}»`, href: '/archive', icon: 'search' });
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
    activeFilters.push({ type: 'tag', label: `#${selectedTag.name}`, href: '/archive', icon: 'tag', variant: 'accent' });
  }
  if (filter && filter !== DEFAULT_FILTER) {
    activeFilters.push({ type: 'filter', label: `مرتب‌سازی: ${filter}`, href: '/archive', icon: 'sort' });
  }

  const { crumbs } = buildArchiveCrumbs({
    type,
    selectedCategory,
    selectedSubcategory,
    selectedTag,
    total,
  });

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const gridPosts = posts.length > 1 ? posts.slice(1) : [];

  return (
    <div className="atl-page">
      <AtelierMasthead
        crumbs={crumbs}
        indexLabel={mastheadIndex}
        kicker={mastheadKicker}
        title={mastheadTitle}
        lead={mastheadLead}
        total={total}
        currentPage={currentPage}
        totalPages={pages}
        categoryCount={categoriesResult.data?.totalCount || categories.length}
        quickPickCategories={quickPickCategories}
        showQuickLinks={!selectedCategory && !selectedTag}
        featuredPost={featuredPost}
      />

      <div className="container" style={{ marginTop: 'var(--ds-space-6)' }}>
        <AtelierToolbar
          filters={FILTERS}
          defaultFilter={DEFAULT_FILTER}
          initialFilter={filter}
          initialQuery={searchQuery}
          categories={categories}
          tags={tags}
          currentCategory={selectedCategory}
          currentTag={selectedTag}
          activeFilters={activeFilters}
          totalCount={total}
        />

        {gridPosts.length > 0 ? (
          <div className="atl-result-meta">
            <span>
              نمایش <b>{posts.length.toLocaleString('fa-IR')}</b> از{' '}
              <b>{total.toLocaleString('fa-IR')}</b> مقاله
            </span>
            <span className="atl-result-meta__rule" aria-hidden />
          </div>
        ) : null}

        {posts.length > 0 ? (
          <AtelierGrid posts={gridPosts} />
        ) : (
          <Empty />
        )}

        {betweenPostsAd ? (
          <div className="atl-ad atl-reveal">
            <span className="atl-ad__label">محتوای تجاری</span>
            <div className="atl-ad__inner">
              <BannerAds ad={betweenPostsAd} variant="rich" />
            </div>
          </div>
        ) : null}

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

      <div className="relative atl-section atl-reveal">
        <BackgroundSection />
        <div className="container relative z-10 py-4">
          <DynamicCategories
            initialCategories={categories}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
        </div>
      </div>

      <div className="container atl-section atl-reveal">
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
