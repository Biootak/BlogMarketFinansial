/**
 * /exchanges/[slug]/hours — صفحهٔ کامل ساعات کاری
 */

import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { splitHours } from '@/lib/exchange-hours';
import type { Metadata } from 'next';
import HoursView from './_components/HoursView';

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
    title: `ساعات کاری ${ex.displayName ?? ex.name} | صرافی`,
    description: `برنامهٔ هفتگی و ساعات کاری ${ex.displayName ?? ex.name}.`,
  };
}

export default async function HoursPage({ params }: Props) {
  const { slug } = await params;
  const ex = await prisma.exchange.findUnique({ where: { slug } });
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
