/**
 * TrendingDeferred — async server component that fetches category data.
 * Wrapped in <Suspense> in page.tsx for true streaming.
 */
import { getPopularCategoriesForHome } from '@/actions/categoryActions';
import DeferredTrending from './DeferredTrending';

export default async function TrendingDeferred() {
  const result = await getPopularCategoriesForHome(16);
  const popularCategories =
    result.success && result.data?.categories
      ? result.data.categories.filter((c) => c.count > 0)
      : [];

  if (!popularCategories.length) return null;

  return (
    <DeferredTrending
      categories={popularCategories}
      maxItems={9}
      title="موضوعات داغ"
      subtitle="پرطرفدارترین دسته‌بندی‌هایی که الان در بازار می‌درخشند"
      viewAllHref="/archive"
    />
  );
}
