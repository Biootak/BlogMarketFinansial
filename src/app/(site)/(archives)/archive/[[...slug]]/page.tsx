import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getTopAuthors } from '@/actions/getTopAuthors';
import { getArchivePosts } from '@/actions/postActions';
import BackgroundSection from '@/components/BackgroundSection/BackgroundSection';
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

const ARCHIVE_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://financialmarket.page';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ page?: string; filter?: string; q?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const [type, category, subcategory] = slug || [];
  let title = 'روایت‌های بازار | روایت، تحلیل و کشف روندهای تازه';
  let description =
    'روایت‌ها و تحلیل‌های برگزیده از بازارهای مالی، اقتصاد و فناوری؛ هر مقاله پنجره‌ای تازه به دنیای سرمایه.';

  if (type === 'category') {
    if (subcategory) {
      title = `${subcategory} در دسته‌بندی ${category} | ${title}`;
      description = `تازه‌ترین مقالات و تحلیل‌های مرتبط با «${subcategory}» در دسته‌بندی ${category}.`;
    } else {
      title = `مقالات دسته‌بندی ${category} | ${title}`;
      description = `هر آنچه درباره‌ی «${category}» نوشته‌ایم؛ از تحلیل تخصصی تا آموزش کاربردی.`;
    }
  } else if (type === 'tag') {
    title = `مقالات با برچسب ${category} | ${title}`;
    description = `همه‌ی مطالب نشان‌دار شده با «${category}»، یکجا و مرتب.`;
  }

  // Paginated / filtered / searched archive URLs are thin duplicates of the
  // canonical listing — instruct crawlers not to index them and point the
  // canonical tag at the clean base URL to avoid duplicate-content penalties.
  const isFilteredView =
    (sp.page && sp.page !== '1') || (sp.filter && sp.filter !== 'همه مقالات') || !!sp.q;
  const canonicalPath = `/archive${slug?.length ? `/${slug.join('/')}` : ''}`;

  return {
    title,
    description,
    alternates: { canonical: `${ARCHIVE_BASE_URL}${canonicalPath}` },
    robots: isFilteredView ? { index: false, follow: true } : { index: true, follow: true },
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
        limit: 6,
        position: 'BETWEEN_POSTS',
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }),
    ]);

  const { posts, total, pages } = postsResult.data || { posts: [], total: 0, pages: 0 };
  const categories = categoriesResult.data?.categories || [];
  const tags = tagsResult.data?.tags || [];
  const topAuthors = topAuthorsResult || [];
  const betweenPostsAds =
    betweenPostsAdsResult.success && Array.isArray(betweenPostsAdsResult.data)
      ? betweenPostsAdsResult.data
      : [];

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
        : 'روایت‌های بازار';

  const mastheadKicker = selectedSubcategory
    ? 'زیرمجموعه'
    : selectedCategory
      ? 'دسته‌بندی'
      : selectedTag
        ? 'برچسب'
        : 'به‌روزرسانی روزانه';

  const mastheadIndex = selectedCategory
    ? `دسته‌بندی · ${selectedCategory.name}`
    : selectedTag
      ? 'مرور بر اساس برچسب'
      : 'آرشیو کامل تحلیل‌ها';

  const mastheadLead = selectedSubcategory
    ? `جدیدترین تحلیل‌ها و یادداشت‌های تخصصی پیرامون ${selectedSubcategory.name} را اینجا دنبال کنید.`
    : selectedCategory
      ? `گزیده‌ای از بهترین مقالات ${selectedCategory.name}؛ از تحلیل‌های عمیق تا آموزش‌های گام‌به‌گام.`
      : selectedTag
        ? `هر آنچه درباره‌ی «${selectedTag.name}» منتشر کرده‌ایم، یکجا و آماده‌ی مطالعه.`
        : 'از تحلیل بازارهای مالی تا فناوری و اقتصاد کلان؛ فضایی آرام برای مطالعه‌ی عمیق و کشف ایده‌های تازه.';

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

  const { crumbs } = buildArchiveCrumbs({
    type,
    selectedCategory,
    selectedSubcategory,
    selectedTag,
    total,
  });

  // featured post فقط در صفحه ۱ و بدون هیچ filter/search نمایش داده می‌شود.
  // در صفحات دیگر یا وقتی filter/search فعال است، همه پست‌ها به grid می‌روند.
  const showFeatured =
    currentPage === 1 && !searchQuery && filter === DEFAULT_FILTER;
  const featuredPost = showFeatured && posts.length > 0 ? posts[0] : null;
  const gridPosts = featuredPost ? posts.slice(1) : posts;

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

      <div className="container" style={{ marginTop: 'var(--ds-space-4)' }}>
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

        {posts.length > 0 ? <AtelierGrid posts={gridPosts} ads={betweenPostsAds} /> : <Empty />}

        {posts.length > 0 && pages > 1 ? (
          <div
            className="flex justify-center"
            style={{
              marginBlock: 'var(--ds-space-10) var(--ds-space-8)',
            }}
          >
            <Pagination currentPage={currentPage} totalPages={pages} />
          </div>
        ) : null}

        {posts.length === 0 ? (
          <div
            className="flex justify-center"
            style={{ marginBlock: 'var(--ds-space-8) var(--ds-space-8)' }}
          >
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              بازگشت به آرشیو
            </Link>
          </div>
        ) : null}
      </div>

      <div className="relative atl-section">
        <BackgroundSection />
        <div className="container relative z-10" style={{ paddingBlock: 'var(--ds-space-2)' }}>
          <DynamicCategories
            initialCategories={categories}
            initialTotalCount={categoriesResult.data?.totalCount || 0}
          />
        </div>
      </div>

      <div className="container atl-section">
        <SectionSliderNewAuthors
          heading="صدای تحلیلگران"
          subHeading="با ذهن‌هایی آشنا شوید که پشت هر روایت، نگاه تیزبین و قلم بی‌طرفی دارند"
          authors={topAuthors}
          itemPerRow={5}
        />
      </div>

      <div className="container atl-section mb-8 lg:mb-12">
        <SectionSubscribe2 />
      </div>
    </div>
  );
}
