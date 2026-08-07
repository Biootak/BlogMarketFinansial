/**
 * GET /api/cron/expire-kyc
 * هر روز یک‌بار: KYC های منقضی‌شده را EXPIRED می‌کند.
 *
 * جریان:
 *   KycRecord هایی که expiresAt < now و rejectedReason=null (یعنی قبلاً approved بوده‌اند)
 *   → rejectedReason='KYC_EXPIRED' + updatedAt=now
 *   → Customer.kycStatus = EXPIRED (اگر Customer وجود داشته باشد)
 *
 * Auth: Authorization: Bearer {CRON_SECRET}
 */

import { verifyCronSecret } from '@/lib/cron-auth';
import prisma from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const t0 = Date.now();
  const now = new Date();

  // پیدا کردن KycRecord های منقضی‌شده‌ای که هنوز expired نشده‌اند
  // شرط: expiresAt < now AND rejectedReason IS NULL (approved بوده)
  // AND reviewedAt IS NOT NULL (توسط ادمین approve شده)
  const expiredRecords = await prisma.kycRecord.findMany({
    where: {
      expiresAt: { lt: now },
      rejectedReason: null,
      reviewedAt: { not: null },
    },
    select: { id: true, userId: true },
    take: 500, // حداکثر ۵۰۰ در هر اجرا — از timeout جلوگیری می‌کند
  });

  if (expiredRecords.length === 0) {
    return NextResponse.json({
      success: true,
      expired: 0,
      durationMs: Date.now() - t0,
      ts: now.toISOString(),
    });
  }

  const userIds = expiredRecords.map((r) => r.userId);

  // همه write ها در یک transaction
  const expiredIds = expiredRecords.map((r) => r.id);

  await prisma.$transaction(async (tx) => {
    // ۱. KycRecord: فقط همین رکوردهای منقضی‌شده را update کن (نه همه KYC های هر userId)
    await tx.kycRecord.updateMany({
      where: { id: { in: expiredIds } },
      data: {
        rejectedReason: 'KYC_EXPIRED',
        updatedAt: now,
      },
    });

    // ۲. Customer.kycStatus = EXPIRED (برای کاربرانی که Customer record دارند)
    await tx.customer.updateMany({
      where: { userId: { in: userIds } },
      data: { kycStatus: 'EXPIRED' },
    });
  });

  return NextResponse.json({
    success: true,
    expired: expiredRecords.length,
    durationMs: Date.now() - t0,
    ts: now.toISOString(),
  });
}
