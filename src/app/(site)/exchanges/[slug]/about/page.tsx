/**
 * /exchanges/[slug]/about — صفحهٔ کامل دربارهٔ صرافی
 */

import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { stripHours, splitHours } from '@/lib/exchange-hours';
import type { Metadata } from 'next';
import AboutView from './_components/AboutView';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ex = await prisma.exchange.findUnique({
    where: { slug },
    select: { name: true, displayName: true },
  });
  if (!ex) return { title: 'صرافی یافت نشد' };
  return {
    title: `دربارهٔ ${ex.displayName ?? ex.name} | صرافی`,
    description: `اطلاعات کامل، مجوزها و استانداردهای ${ex.displayName ?? ex.name}.`,
  };
}

export default async function AboutPage({ params }: Props) {
  const { slug } = await params;
  const ex = await prisma.exchange.findUnique({
    where: { slug },
    include: { _count: { select: { Customer: true, Transaction: true } } },
  });
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
