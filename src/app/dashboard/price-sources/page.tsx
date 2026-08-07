import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PriceSourcesClient } from './_components/PriceSourcesClient';

export const metadata: Metadata = {
  title: 'مدیریت منابع قیمت | داشبورد',
};

async function getPriceSources() {
  // این تابع بعد از اینکه مدل PriceSource را به Prisma اضافه کردیم، از DB می‌خواند
  // فعلاً یک لیست hardcode برمی‌گردانیم
  return [
    {
      id: 'tgju',
      name: 'TGJU.org',
      url: 'https://tgju.org',
      type: 'html' as const,
      enabled: true,
      priority: 1,
      fetchCount: 1000,
      errorCount: 5,
      lastFetchAt: new Date(),
      lastFetchStatus: 'active' as const,
    },
    {
      id: 'bonbast',
      name: 'Bonbast.com',
      url: 'https://bonbast.com',
      type: 'html' as const,
      enabled: true,
      priority: 2,
      fetchCount: 500,
      errorCount: 2,
      lastFetchAt: new Date(),
      lastFetchStatus: 'active' as const,
    },
    {
      id: 'sarafi',
      name: 'Sarafi.af',
      url: 'https://sarafi.af',
      type: 'html' as const,
      enabled: true,
      priority: 3,
      fetchCount: 300,
      errorCount: 10,
      lastFetchAt: new Date(),
      lastFetchStatus: 'active' as const,
    },
    {
      id: 'exir',
      name: 'Exir.io',
      url: 'https://exir.io',
      type: 'api' as const,
      enabled: false,
      priority: 4,
      fetchCount: 0,
      errorCount: 0,
      lastFetchStatus: 'inactive' as const,
    },
    {
      id: 'tetherland',
      name: 'Tetherland.com',
      url: 'https://tetherland.com',
      type: 'api' as const,
      enabled: false,
      priority: 5,
      fetchCount: 0,
      errorCount: 0,
      lastFetchStatus: 'inactive' as const,
    },
  ];
}

export default async function PriceSourcesPage() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
    redirect('/dashboard');
  }

  const sources = await getPriceSources();

  return (
    <div className="at-page" dir="rtl">
      <PriceSourcesClient sources={sources} />
    </div>
  );
}
