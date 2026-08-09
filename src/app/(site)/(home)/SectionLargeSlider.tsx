import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import { getMarketRates } from '@/actions/market-rates';
import { getRateLists } from '@/actions/rate-lists';
import Empty from '@/components/Empty';
import type { MarketRateItem } from '@/lib/market-rates';
import type { RateListData } from '@/types/types';
import DeferredDesign7 from './deferred/DeferredDesign7';

// No `react.cache()` wrappers around the server actions here: wrapping a
// 'use server' export in `cache()` can re-run the flight loader's
// `registerServerReference` and throw `Cannot redefine property:
// $$FORM_ACTION`. It's also unnecessary — server actions already dedupe
// per-request and `safeCache` handles cross-request caching.
//
// 2026-07-04: getMarketRates() از اینجا حذف شد؛ نوار بازار ابتدا به سطح
// بالاتر (page.tsx) منتقل شد، سپس همان‌جا هم حذف شد. نوار بازار فقط در
// داشبورد (AtelierDeck) نمایش داده می‌شود.
export default async function SectionLargeSlider() {
  const [postsResult, rateLists, marketRates] = await Promise.all([
    getFeaturedPosts(3),
    getRateLists(),
    // نرخ‌های اسکریپر (SARA_* = سرای شاهزاده، به افغانی) — snapshot-fast و safeCached است
    getMarketRates().catch(() => [] as MarketRateItem[]),
  ]);

  if (postsResult.error) {
    // Silent fail — featured posts section simply won't render if unavailable
    return <Empty />;
  }

  if (!postsResult.data || postsResult.data.length === 0) {
    return <Empty />;
  }

  const activeRateLists: RateListData[] = rateLists.filter((l: RateListData) => l.isActive);

  return (
    <div>
      <DeferredDesign7
        initialPosts={postsResult.data}
        rateLists={activeRateLists}
        marketRates={marketRates}
        className="pt-4 pb-3 md:py-5 lg:pt-5"
      />
    </div>
  );
}
