/**
 * /exchanges/[slug]/hours — صفحهٔ کامل ساعات کاری
 *
 * 2026-08-perf: هر دو کوئری (metadata + page) از safeCache استفاده می‌کنند
 * تا DB hit تکراری حذف شود.
 */

import prisma from '@/lib/db';
import { splitHours } from '@/lib/exchange-hours';
import { safeCache } from '@/lib/safe-cache';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HoursView from './_components/HoursView';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const getExchangeHours = safeCache(
  async (slug: string) =>
    prisma.exchange.findUnique({
      where: { slug },
      select: { name: true, displayName: true, address: true, city: true, status: true },
    }),
  null,
  { key: 'exchange-hours', ttl: 60, tags: ['exchanges'] },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ex = await getExchangeHours(slug);
  if (!ex) return { title: 'صرافی یافت نشد' };
  return {
    title: `ساعات کاری ${ex.displayName ?? ex.name} | صرافی`,
    description: `برنامهٔ هفتگی و ساعات کاری ${ex.displayName ?? ex.name}.`,
  };
}

export default async function HoursPage({ params }: Props) {
  const { slug } = await params;
  // از همان slot cache — صفر DB hit اضافی نسبت به generateMetadata
  const ex = await getExchangeHours(slug);
  if (!ex || ex.status !== 'ACTIVE') notFound();
  const { hours } = splitHours(ex.address);
  return (
    <HoursView
      exchange={{
        name: ex.displayName ?? ex.name,
        city: ex.city,
      }}
      hours={hours}
    />
  );
}
