import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import { getMarketRates } from '@/actions/market-rates';
import { getRateLists } from '@/actions/rate-lists';
import Empty from '@/components/Empty';
import type { PostWithRelations, RateListData } from '@/types/types';
import DeferredDesign7 from './deferred/DeferredDesign7';

// 2026-06-27: Removed `react.cache()` wrappers around the server actions.
// Under `cacheComponents: true` (Next 16), wrapping a 'use server' export
// in `cache()` causes the flight loader's `registerServerReference` to
// run twice during the 'use cache' prerender pass, throwing
// `Cannot redefine property: $$FORM_ACTION`. Server actions already dedupe
// per-request; `safeCache` handles cross-request caching.
export default async function SectionLargeSlider() {
  const [postsResult, ratesResult, marketRates, rateLists] = await Promise.all([
    getFeaturedPosts(3),
    fetchCryptoTickerRates(),
    getMarketRates(),
    getRateLists(),
  ]);

  if (postsResult.error) {
    console.error('Error fetching featured posts:', postsResult.error);
    return <Empty />;
  }

  if (!postsResult.data || postsResult.data.length === 0) {
    return <Empty />;
  }

  const activeRateLists: RateListData[] = rateLists.filter(
    (l: RateListData) => l.isActive,
  );

  return (
    <div>
      <DeferredDesign7
        initialPosts={postsResult.data}
        rates={ratesResult.success ? ratesResult.data : undefined}
        marketRates={marketRates}
        rateLists={activeRateLists}
        className="pt-4 pb-3 md:py-5 lg:pt-5"
      />
    </div>
  );
}
