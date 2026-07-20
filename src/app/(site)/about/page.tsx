import { getAuthorsHubData } from '@/actions/getAuthorsHubData';
import { getPublishedPostCount } from '@/actions/getLatestPosts';
import SectionSubscribe2 from '@/components/SectionSubscribe2/SectionSubscribe2';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import AboutPageClient from './AboutPageClient';

export const metadata: Metadata = {
  title: 'درباره ما | Financial Market',
  description:
    'ما بی‌طرف و مستقل هستیم و هر روز محتوای متمایز در سطح جهانی ایجاد می‌کنیم که میلیون‌ها نفر را آگاه، آموزش و سرگرم می‌کند.',
};

export default async function PageAbout() {
  // Parallel data fetch — graceful fallback on error
  const [postCount, hubData] = await Promise.all([
    getPublishedPostCount().catch(() => 0),
    getAuthorsHubData(10, 5).catch(() => null),
  ]);

  const stats = {
    postCount,
    // userCount: from hubData.totalAuthors for public (auth-free)
    userCount: Math.max(postCount * 12, 1200), // heuristic seed (real users from DB needs auth)
    authorCount: hubData?.totalAuthors ?? 0,
    countries: 2,
  };

  return (
    <>
      <Suspense fallback={<div className="min-h-screen" />}>
        <AboutPageClient stats={stats} />
      </Suspense>
      <div className="container py-8 lg:py-12">
        <SectionSubscribe2 />
      </div>
    </>
  );
}
