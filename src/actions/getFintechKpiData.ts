'use server';

/**
 * getFintechKpiData — Server Action برای KPI های فین‌تک در داشبورد
 *
 * داده‌های ۲۴ ساعت اخیر:
 * - تراکنش‌ها
 * - مشتریان فعال (Customer)
 * - موارد باز fraud
 * - درخواست‌های در انتظار
 * - حجم معاملات (deals) — از آخرین ۳۰ روز
 */

import type { FintechKpiData } from '@/components/Dashboard/FintechKpi/FintechKpiWidget';
import prisma from '@/lib/db';
import { safeCache } from '@/lib/safe-cache';

export const getFintechKpiData = safeCache(
  async (): Promise<FintechKpiData> => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [txn24h, activeCustomers, openFraudCases, pendingRequests, dealsAgg] = await Promise.all([
      // تراکنش‌های ۲۴ ساعت اخیر
      prisma.transaction.count({
        where: { createdAt: { gte: yesterday } },
      }),
      // مشتریان فعال (Customer با KYC تأیید شده)
      prisma.customer.count({
        where: { kycStatus: 'APPROVED' },
      }),
      // موارد باز fraud
      prisma.fraudReview.count({
        where: { status: 'OPEN' },
      }),
      // درخواست‌های در انتظار
      prisma.serviceRequest.count({
        where: { status: 'PENDING' },
      }),
      // حجم معاملات ۳۰ روز (sum of fromAmount completed)
      prisma.currencyDeal.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: thirtyDaysAgo },
        },
        _sum: { fromAmount: true },
      }),
    ]);

    const volumeRaw = dealsAgg._sum.fromAmount;
    // Prisma Decimal → number
    const dealsVolume = volumeRaw ? Number(volumeRaw.toString()) : 0;

    return {
      txn24h,
      activeCustomers,
      openFraudCases,
      pendingRequests,
      dealsVolume,
      dealsCurrency: 'AFN',
    };
  },
  {
    txn24h: 0,
    activeCustomers: 0,
    openFraudCases: 0,
    pendingRequests: 0,
    dealsVolume: 0,
    dealsCurrency: 'AFN',
  } as FintechKpiData,
  {
    key: 'fintech-kpi',
    ttl: 120, // کش ۲ دقیقه
    tags: ['dashboard-stats'],
  },
);
