import {
  AdBannerSkeleton,
  HeroSectionSkeleton,
  SectionAuthorsSkeleton,
  SectionCategoriesSkeleton,
  SectionMagazine7Skeleton,
} from '@/components/Skeletons';
import CardLarge1Skeleton from '@/components/Skeletons/CardLarge1Skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import CryptoTickerSection from '@/components/Sections/CryptoTickerSection';
import PulseSection from '@/components/Sections/PulseBoard/PulseSection';
import HeroSection from './HeroSection';
import SectionLargeSlider from './SectionLargeSlider';
import ServicesSection from './ServicesSection';
import TrustSection from './TrustSection';
import AdStripsDeferred from './deferred/AdStripsDeferred';
import PostsSection from './deferred/PostsSection';
import TopAuthorsSectionDeferred from './deferred/TopAuthorsSectionDeferred';
import TrendingDeferred from './deferred/TrendingDeferred';

// 2026-08-02: header no longer awaits auth() (client-side session island), so
// the home page can be ISR. Sections stream via Suspense; DB reads are deduped
// through safeCache. HTML is revalidated every 5 minutes and on mutations
// (revalidatePath/revalidateTag in post/rate actions).
export const revalidate = 300;

// Streaming architecture (2026): each data-heavy section is an async server
// component wrapped in its own <Suspense> boundary so the page shell renders
// immediately and sections stream in as their data arrives. This eliminates
// the "blank page + loading.tsx flash" caused by a top-level Promise.all block.
export default function Home() {
  return (
    <div className="nc-HomePage relative">
      {/* ── Hero Section (async — fetches market rates) ──────── */}
      {/* ⚠️ بدون container — hero full-width است و padding خودش را دارد */}
      <div className="container relative pt-4 sm:pt-6 lg:pt-10">
        <Suspense fallback={<HeroSectionSkeleton />}>
          <HeroSection />
        </Suspense>
      </div>

      {/* ── Services Section (static) ────────────────────────── */}
      <div className="container relative mt-6 sm:mt-8 lg:mt-12">
        <ServicesSection />
      </div>

      {/* ── Market Tickers (async, suspended) ───────────────── */}
      <div className="container relative mt-6 sm:mt-8 lg:mt-12">
        <Suspense fallback={<Skeleton className="h-24 sm:h-28 rounded-2xl" />}>
          <CryptoTickerSection />
        </Suspense>

        <Suspense fallback={<CardLarge1Skeleton />}>
          <SectionLargeSlider />
        </Suspense>
      </div>

      {/* ── Trending Topics (async streaming) ───────────────── */}
      <div className="container relative mt-6 sm:mt-8 lg:mt-12">
        <Suspense fallback={<SectionCategoriesSkeleton />}>
          <TrendingDeferred />
        </Suspense>
      </div>

      {/* ── Pulse Board (async, suspended) ──────────────────── */}
      <div className="container relative mt-6 sm:mt-8 lg:mt-12">
        <Suspense
          fallback={
            <div className="space-y-3 sm:space-y-4">
              <Skeleton className="h-9 sm:h-10 w-full rounded-2xl" />
              <Skeleton className="h-[360px] sm:h-[480px] w-full rounded-3xl" />
            </div>
          }
        >
          <PulseSection />
        </Suspense>
      </div>

      {/* ── Ad Strips + Posts + Authors (single Suspense boundary) ── */}
      <Suspense
        fallback={
          <>
            <div className="container relative mt-4 sm:mt-5 lg:mt-6">
              <AdBannerSkeleton />
            </div>
            <div className="container relative mt-4 sm:mt-5 lg:mt-6">
              <SectionMagazine7Skeleton />
            </div>
            <div className="container relative mt-4 sm:mt-5 lg:mt-6">
              <AdBannerSkeleton />
            </div>
          </>
        }
      >
        <AdStripsDeferred />
        <div className="container relative mt-4 sm:mt-5 lg:mt-6">
          <PostsSection />
        </div>
      </Suspense>

      {/* ── Top Authors (async streaming) ───────────────────── */}
      <div className="container relative mt-4 sm:mt-5 lg:mt-6">
        <Suspense fallback={<SectionAuthorsSkeleton />}>
          <TopAuthorsSectionDeferred />
        </Suspense>
      </div>

      {/* ── Trust & Stats Section (static) ──────────────────── */}
      <div className="container relative mt-4 sm:mt-6 lg:mt-8">
        <TrustSection />
      </div>

      {/* ── Newsletter — آخرین section، با bottom padding برای mobile nav ── */}
      <div className="container relative mt-6 sm:mt-8 lg:mt-12 mb-28 sm:mb-24 lg:mb-16 pb-4 sm:pb-6">
        <SectionSubscribe2 className="" />
      </div>
    </div>
  );
}
