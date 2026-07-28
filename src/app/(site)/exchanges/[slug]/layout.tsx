/**
 * /exchanges/[slug]/layout — Shell مشترک برای صفحهٔ اصلی و زیر‌مسیرها
 *
 *   1. SubNav sticky: پروفایل | بازارها | ساعات کاری | درباره | تماس
 *   2. Hydrates exchange data once برای همهٔ child routes
 */

import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getPublicExchangeServices } from '@/actions/exchange-services';
import SubNav from './_components/SubNav';

export const revalidate = 60;

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: LayoutProps) {
  const { slug } = await params;
  const exchange = await prisma.exchange.findUnique({
    where: { slug },
    select: { name: true, displayName: true, city: true, status: true },
  });
  if (!exchange) return { title: 'صرافی یافت نشد', robots: { index: false } };
  const title = exchange.displayName ?? exchange.name;
  return {
    title: `${title} | صرافی`,
    description: exchange.city
      ? `${title} — صرافی تأییدشده در ${exchange.city}`
      : `${title} — صرافی تأییدشده`,
  };
}

export default async function ExchangeLayout({ children, params }: LayoutProps) {
  const { slug } = await params;

  const exchange = await prisma.exchange.findUnique({
    where: { slug },
    include: {
      ExchangeRateQuote: {
        where: { status: 'ACTIVE' },
        orderBy: [{ currencyCode: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      },
      _count: { select: { Customer: true, Transaction: true } },
    },
  });

  if (!exchange || exchange.status !== 'ACTIVE') notFound();

  // 2026-07-28: تعداد سرویس‌های فعال برای نمایش pill «خدمات» در SubNav
  const services = await getPublicExchangeServices(slug);

  // تبدیل به DTO ساده برای SubNav (بدون leaking Prisma types به client)
  const navData = {
    slug: exchange.slug,
    name: exchange.displayName ?? exchange.name,
    city: exchange.city ?? null,
    activeCurrencies: new Set(exchange.ExchangeRateQuote.map((q) => q.currencyCode)).size,
    hasHours: Boolean(exchange.address?.includes(';HOURS=')),
    serviceCount: services.length,
  };

  return (
    <>
      <SubNav exchange={navData} />
      {children}
    </>
  );
}
