import { cache } from 'react';
import { getFeaturedPosts } from '@/actions/getFeaturedPosts';
import { fetchExchangeRates } from '@/actions/fetchExchangeRates';
import { getMarketTickerRates } from '@/actions/marketTickerRates';
import { getNavasanTickerRates } from '@/actions/navasanTickerRates';
import { getRateLists } from '@/actions/rate-lists';
import type { PostWithRelations, ActionResult, RateListData } from '@/types/types';
import SectionLargeSliderClient from './SectionLargeSliderClient';
import Empty from '@/components/Empty';

const getFeaturedPostsCached = cache(getFeaturedPosts);
const getExchangeRatesCached = cache(fetchExchangeRates);
const getMarketTickerRatesCached = cache(getMarketTickerRates);
const getNavasanTickerRatesCached = cache(getNavasanTickerRates);
const getRateListsCached = cache(getRateLists);

export default async function SectionLargeSlider() {
  const [postsResult, ratesResult, marketRates, navasanRates, rateLists] = await Promise.all([
    getFeaturedPostsCached(3),
    getExchangeRatesCached(),
    getMarketTickerRatesCached(),
    getNavasanTickerRatesCached(),
    getRateListsCached(),
  ]);

  if (postsResult.error) {
    // اگر خطایی رخ داده باشد، می‌توانید آن را مدیریت کنید
    console.error('Error fetching featured posts:', postsResult.error);
    return <Empty />;
  }

  if (!postsResult.data || postsResult.data.length === 0) {
    return <Empty />;
  }

  // فقط rate-list های فعال
  const activeRateLists: RateListData[] = rateLists.filter((l) => l.isActive);

  return (
    <div>
      <SectionLargeSliderClient
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
