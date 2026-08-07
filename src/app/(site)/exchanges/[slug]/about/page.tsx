/**
 * /exchanges/[slug]/about — صفحهٔ کامل دربارهٔ صرافی
 *
 * 2026-08-perf: هر دو کوئری (metadata + page) از safeCache استفاده می‌کنند
 * تا DB hit تکراری حذف شود.
 */

import prisma from '@/lib/db';
import { splitHours, stripHours } from '@/lib/exchange-hours';
import { safeCache } from '@/lib/safe-cache';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AboutView from './_components/AboutView';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const getExchangeAbout = safeCache(
  async (slug: string) =>
    prisma.exchange.findUnique({
      where: { slug },
      include: { _count: { select: { Customer: true, Transaction: true } } },
    }),
  null,
  { key: 'exchange-about', ttl: 60, tags: ['exchanges'] },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // همان slot — بدون DB hit اضافی
  const ex = await getExchangeAbout(slug);
  if (!ex) return { title: 'صرافی یافت نشد' };
  return {
    title: `دربارهٔ ${ex.displayName ?? ex.name} | صرافی`,
    description: `اطلاعات کامل، مجوزها و استانداردهای ${ex.displayName ?? ex.name}.`,
  };
}

export default async function AboutPage({ params }: Props) {
  const { slug } = await params;
  const ex = await getExchangeAbout(slug);
  if (!ex || ex.status !== 'ACTIVE') notFound();
  const { hours } = splitHours(ex.address);
  const visibleAddress = stripHours(ex.address);

  return (
    <AboutView
      exchange={{
        name: ex.name,
        displayName: ex.displayName,
        logoUrl: ex.logoUrl,
        city: ex.city,
        address: visibleAddress,
        phone: ex.phone,
        email: ex.email,
        website: ex.website,
        licenseNo: ex.licenseNo,
        createdAt: ex.createdAt,
        _count: ex._count,
        hasHours: Object.keys(hours).length > 0,
      }}
    />
  );
}
