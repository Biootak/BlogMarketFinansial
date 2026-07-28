/**
 * /exchanges/[slug] — صفحه عمومی پروفایل صرافی
 *
 *   ساختار P2026:
 *   ─────────────────────────────────────────────────────────
 *   1. Hero identity — لوگو + نام + شهر + وضعیت تأیید
 *   2. Live rates — نرخ خرید/فروش لحظه‌ای ارزهای فعال
 *   3. Working hours — HoursMatrix read-only
 *   4. Contact — تلفن، ایمیل، وبسایت
 *   5. About — توضیحات + license + تاریخ عضویت
 *
 *   Server component برای سئو (خزش‌پذیر) و revalidate هر ۶۰ ثانیه.
 */

import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { stripHours } from '@/lib/exchange-hours';
import ExchangePublicView from './_components/ExchangePublicView';

export const revalidate = 60;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const exchange = await prisma.exchange.findUnique({
    where: { slug },
    select: {
      name: true,
      displayName: true,
      city: true,
      logoUrl: true,
      status: true,
    },
  });

  if (!exchange) {
    return {
      title: 'صرافی یافت نشد',
      robots: { index: false },
    };
  }

  const title = exchange.displayName ?? exchange.name;
  const description = exchange.city
    ? `${title} — صرافی تأییدشده در ${exchange.city}. نرخ لحظه‌ای ارز، اطلاعات تماس و ساعات کاری.`
    : `${title} — صرافی تأییدشده. نرخ لحظه‌ای ارز، اطلاعات تماس و ساعات کاری.`;

  return {
    title: `${title} | صرافی`,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: exchange.logoUrl ? [{ url: exchange.logoUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: exchange.logoUrl ? [exchange.logoUrl] : undefined,
    },
  };
}

async function getExchangeBySlug(slug: string) {
  const exchange = await prisma.exchange.findUnique({
    where: { slug },
    include: {
      ExchangeRateQuote: {
        where: { status: 'ACTIVE' },
        orderBy: [{ currencyCode: 'asc' }, { createdAt: 'desc' }],
        take: 50,
      },
      _count: {
        select: {
          Customer: true,
          Transaction: true,
        },
      },
    },
  });

  if (!exchange) return null;

  // فقط صرافی‌های ACTIVE برای عموم قابل نمایش‌اند
  if (exchange.status !== 'ACTIVE') return null;

  return exchange;
}

export default async function ExchangePublicPage({ params }: PageProps) {
  const { slug } = await params;
  const exchange = await getExchangeBySlug(slug);

  if (!exchange) notFound();

  // استخراج ساعات کاری از address (backward compatible)
  const visibleAddress = stripHours(exchange.address);

  // کاهش نرخ‌ها به آخرین نرخ هر ارز (unique by currencyCode)
  const latestByCurrency = new Map<
    string,
    { buyRate: string; sellRate: string; unit: string; createdAt: Date }
  >();
  for (const quote of exchange.ExchangeRateQuote) {
    if (!latestByCurrency.has(quote.currencyCode)) {
      latestByCurrency.set(quote.currencyCode, {
        buyRate: quote.buyRate.toString(),
        sellRate: quote.sellRate.toString(),
        unit: quote.unit,
        createdAt: quote.createdAt,
      });
    }
  }
  const rates = [...latestByCurrency.entries()].map(([code, data]) => ({
    currencyCode: code,
    ...data,
  }));

  return (
    <ExchangePublicView
      exchange={{
        id: exchange.id,
        slug: exchange.slug,
        name: exchange.name,
        displayName: exchange.displayName,
        logoUrl: exchange.logoUrl,
        city: exchange.city,
        address: visibleAddress,
        phone: exchange.phone,
        email: exchange.email,
        website: exchange.website,
        licenseNo: exchange.licenseNo,
        status: exchange.status,
        createdAt: exchange.createdAt,
        _count: exchange._count,
      }}
      rates={rates}
    />
  );
}
