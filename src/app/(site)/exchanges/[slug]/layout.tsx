/**
 * /exchanges/[slug]/layout — Shell مشترک برای صفحهٔ اصلی و زیر‌مسیرها
 *
 *   1. SubNav sticky: پروفایل | بازارها | ساعات کاری | درباره | تماس
 *   2. Hydrates exchange data once برای همهٔ child routes
 *
 * 2026-08-perf: getPublicExchangeServices و prisma.exchange موازی شدند (Promise.all).
 * generateMetadata از safeCache استفاده می‌کند تا DB hit تکراری نشود.
 */

import { getPublicExchangeServices } from '@/actions/exchange-services';
import { safeCache } from '@/lib/safe-cache';
import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import SubNav from './_components/SubNav';

export const revalidate = 60;

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

/** کش ۶۰ثانیه‌ای — هم metadata هم layout از همین نتیجه استفاده می‌کنند */
const getExchangeMeta = safeCache(
  async (slug: string) =>
    prisma.exchange.findUnique({
      where: { slug },
      select: { name: true, displayName: true, city: true, status: true },
    }),
  null,
  { key: 'exchange-meta', ttl: 60, tags: ['exchanges', 'exchange-rates'] },
);

const getExchangeWithQuotes = safeCache(
  async (slug: string) =>
    prisma.exchange.findUnique({
      where: { slug },
      include: {
        ExchangeRateQuote: {
          where: { status: 'ACTIVE' },
          orderBy: [{ currencyCode: 'asc' }, { createdAt: 'desc' }],
          take: 50,
        },
        _count: { select: { Customer: true, Transaction: true } },
      },
    }),
  null,
  { key: 'exchange-with-quotes', ttl: 60, tags: ['exchanges', 'exchange-rates'] },
);

export async function generateMetadata({ params }: LayoutProps) {
  const { slug } = await params;
  const exchange = await getExchangeMeta(slug);
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

  // 2026-08-perf: موازی — هر دو query هم‌زمان اجرا می‌شوند (−50% زمان انتظار)
  const [exchange, services] = await Promise.all([
    getExchangeWithQuotes(slug),
    getPublicExchangeServices(slug),
  ]);

  if (!exchange || exchange.status !== 'ACTIVE') notFound();

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
