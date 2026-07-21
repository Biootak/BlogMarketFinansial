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

// Dynamically rendered on demand: the shared site header (MainNav) reads
// auth() to render sign-in/avatar state, which opts the whole (site) tree out
// of static generation — so `revalidate` here would be a no-op. DB reads are
// deduped via safeCache; HTML is edge-cached via the s-maxage header in
// next.config.ts.
//
// Streaming architecture (2026): each data-heavy section is an async server
// component wrapped in its own <Suspense> boundary so the page shell renders
// immediately and sections stream in as their data arrives. This eliminates
// the "blank page + loading.tsx flash" caused by a top-level Promise.all block.
export default function Home() {
  return (
    <div className="nc-HomePage relative">
      {/* ── Hero Section (async — fetches market rates) ──────── */}
      <div className="container relative pt-6 sm:pt-8">
        <Suspense fallback={<HeroSectionSkeleton />}>
          <HeroSection />
        </Suspense>
      </div>

      {/* ── Services Section (static) ────────────────────────── */}
      <div className="container relative mt-6 lg:mt-8">
        <ServicesSection />
      </div>

      {/* ── Market Tickers (async, suspended) ───────────────── */}
      <div className="container relative">
        <Suspense fallback={<Skeleton className="h-28 rounded-2xl" />}>
          <CryptoTickerSection />
        </Suspense>

        <Suspense fallback={<CardLarge1Skeleton />}>
          <SectionLargeSlider />
        </Suspense>
      </div>

      {/* ── Trending Topics (async streaming) ───────────────── */}
      <div className="container relative mt-4 lg:mt-5">
        <Suspense fallback={<SectionCategoriesSkeleton />}>
          <TrendingDeferred />
        </Suspense>
      </div>

      {/* ── Pulse Board (async, suspended) ──────────────────── */}
      <div className="container relative mt-4 lg:mt-6">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-[480px] w-full rounded-3xl" />
            </div>
          }
        >
          <PulseSection />
        </Suspense>
      </div>

      {/* ── Ad Strips + Posts + Authors (single Suspense boundary) ── */}
      {/* Ads and posts share the same visual area — stream together */}
      <Suspense
        fallback={
          <>
            <div className="container relative mt-4 lg:mt-6">
              <AdBannerSkeleton />
            </div>
            <div className="container relative mt-4 lg:mt-6">
              <SectionMagazine7Skeleton />
            </div>
            <div className="container relative mt-4 lg:mt-6">
              <AdBannerSkeleton />
            </div>
          </>
        }
      >
        <AdStripsDeferred />
        <div className="container relative mt-4 lg:mt-6">
          <PostsSection />
        </div>
      </Suspense>

      {/* ── Top Authors (async streaming) ───────────────────── */}
      <div className="container relative mt-4 lg:mt-6">
        <Suspense fallback={<SectionAuthorsSkeleton />}>
          <TopAuthorsSectionDeferred />
        </Suspense>
      </div>

      {/* ── Trust & Stats Section (static) ──────────────────── */}
      <div className="container relative mt-4 lg:mt-6">
        <TrustSection />
      </div>

      <div className="container relative mt-4 lg:mt-6 mb-8 lg:mb-12">
        <SectionSubscribe2 className="" />
      </div>
    </div>
  );
}
