import { cache } from 'react';
import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { getMarketRates } from '@/actions/marketRates';
import { getNavasanRates } from '@/actions/navasanRates';
import { getRateLists } from '@/actions/rate-lists';
import type { PostWithRelations, ActionResult, RateListData } from '@/types/types';
import DeferredDesign7 from './deferred/DeferredDesign7';
import Empty from '@/components/Empty';

const getFeaturedPostsCached = cache(getFeaturedPosts);
const getCryptoTickerRatesCached = cache(fetchCryptoTickerRates);
const getMarketRatesCached = cache(getMarketRates);
const getNavasanRatesCached = cache(getNavasanRates);
const getRateListsCached = cache(getRateLists);

export default async function SectionLargeSlider() {
  const [postsResult, ratesResult, marketRates, navasanRates, rateLists] = await Promise.all([
    getFeaturedPostsCached(3),
    getCryptoTickerRatesCached(),
    getMarketRatesCached(),
    getNavasanRatesCached(),
    getRateListsCached(),
  ]);

  if (postsResult.error) {
    console.error('Error fetching featured posts:', postsResult.error);
    return <Empty />;
  }

  if (!postsResult.data || postsResult.data.length === 0) {
    return <Empty />;
  }

  const activeRateLists: RateListData[] = rateLists.filter((l) => l.isActive);

  return (
    <div>
      <DeferredDesign7
        initialPosts={postsResult.data}
        rates={ratesResult.success ? ratesResult.data : undefined}
        marketRates={marketRates}
        navasanRates={navasanRates}
        rateLists={activeRateLists}
        className="pt-4 pb-3 md:py-5 lg:pt-5"
      />
    </div>
  );
}
