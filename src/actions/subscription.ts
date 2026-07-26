'use server';

/**
 * subscription.ts — Server Actions برای مدیریت پلن اشتراک کاربر.
 *
 * پلن‌ها: free, pro, business
 * هر ارتقاء یک SubscriptionEvent با invoiceNo ثبت می‌شود.
 *
 * امنیت:
 *   - requireUser
 *   - rate-limit برای upgrade
 *   - audit log
 *   - idempotency
 */

import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

export type PlanId = 'free' | 'pro' | 'business';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number; // in AFN (cents-like, but for AFN we'll use whole units)
  yearlyPrice: number;
  currency: string;
  features: { ok: boolean; text: string }[];
  highlight: boolean;
  badge?: string;
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'رایگان',
    tagline: 'برای شروع و آشنایی',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'AFN',
    badge: 'پیش‌فرض',
    highlight: false,
    features: [
      { ok: true, text: 'انتشار نامحدود پست' },
      { ok: true, text: 'آپلود تصویر و رسانه' },
      { ok: true, text: 'آمار پایه بازدید' },
      { ok: false, text: 'آمار پیشرفته و SEO' },
      { ok: false, text: 'Newsletter خودکار' },
      { ok: false, text: 'پشتیبانی اولویت‌دار' },
    ],
  },
  {
    id: 'pro',
    name: 'حرفه‌ای',
    tagline: 'برای نویسندگان و خبرنگاران فعال',
    monthlyPrice: 499_00,
    yearlyPrice: 4990_00,
    currency: 'AFN',
    badge: 'محبوب',
    highlight: true,
    features: [
      { ok: true, text: 'همه امکانات پلن رایگان' },
      { ok: true, text: 'آمار پیشرفته بازدید' },
      { ok: true, text: 'ابزارهای SEO' },
      { ok: true, text: 'Newsletter ماهانه خودکار' },
      { ok: true, text: 'بدون تبلیغات' },
      { ok: false, text: 'مدیریت چند نویسنده' },
    ],
  },
  {
    id: 'business',
    name: 'سازمانی',
    tagline: 'برای تیم‌ها و رسانه‌ها',
    monthlyPrice: 1499_00,
    yearlyPrice: 14990_00,
    currency: 'AFN',
    badge: 'حرفه‌ای‌ترین',
    highlight: false,
    features: [
      { ok: true, text: 'همه امکانات پلن حرفه‌ای' },
      { ok: true, text: 'مدیریت چند نویسنده' },
      { ok: true, text: 'API اختصاصی' },
      { ok: true, text: 'گزارش‌های تحلیلی ماهانه' },
      { ok: true, text: 'پشتیبانی ۲۴/۷' },
      { ok: true, text: 'SLA تضمینی ۹۹.۹٪' },
    ],
  },
];

export function getPlan(id: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === id);
}

export interface UserSubscription {
  currentPlan: PlanId;
  planExpiresAt: string | null;
  events: Array<{
    id: string;
    kind: string;
    fromPlan: string | null;
    toPlan: string;
    amount: string;
    currency: string;
    invoiceNo: string | null;
    status: string;
    paymentMethod: string | null;
    validUntil: string | null;
    createdAt: string;
  }>;
}

export async function getUserSubscription(): Promise<FintechActionResult<UserSubscription>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب شوید' } };
  }

  const events = await prisma.subscriptionEvent.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      kind: true,
      fromPlan: true,
      toPlan: true,
      amount: true,
      currency: true,
      invoiceNo: true,
      status: true,
      paymentMethod: true,
      validUntil: true,
      createdAt: true,
    },
  });

  // پلن فعلی: آخرین رویدادی که به PAID رسیده و منقضی نشده
  const now = Date.now();
  const activeEvent = events.find(
    (e) => e.status === 'PAID' && (!e.validUntil || e.validUntil.getTime() > now),
  );
  const currentPlan: PlanId = (activeEvent?.toPlan as PlanId) ?? 'free';
  const planExpiresAt = activeEvent?.validUntil?.toISOString() ?? null;

  return {
    success: true,
    data: {
      currentPlan,
      planExpiresAt,
      events: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        fromPlan: e.fromPlan,
        toPlan: e.toPlan,
        amount: e.amount.toString(),
        currency: e.currency,
        invoiceNo: e.invoiceNo,
        status: e.status,
        paymentMethod: e.paymentMethod,
        validUntil: e.validUntil ? e.validUntil.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      })),
    },
  };
}

const ChangePlanSchema = z.object({
  planId: z.enum(['free', 'pro', 'business']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER', 'CRYPTO']).default('CARD'),
});

export async function changePlan(
  raw: unknown,
): Promise<FintechActionResult<{ invoiceNo: string; newPlan: PlanId; validUntil: string }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب شوید' } };
  }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`plan:${auth.user.id}`, 'api');
  if (!rl.success) {
    return {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌های تغییر پلن زیاد است' },
    };
  }

  const parsed = ChangePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }
  const { planId, billingCycle, paymentMethod } = parsed.data;

  const lastEvent = await prisma.subscriptionEvent.findFirst({
    where: { userId: auth.user.id, status: 'PAID' },
    orderBy: { createdAt: 'desc' },
    select: { toPlan: true, validUntil: true },
  });
  const nowMs = Date.now();
  const fromPlan: PlanId =
    lastEvent && (!lastEvent.validUntil || lastEvent.validUntil.getTime() > nowMs)
      ? (lastEvent.toPlan as PlanId)
      : 'free';
  if (fromPlan === planId) {
    return {
      success: false,
      error: { code: 'SAME_PLAN', message: 'شما در حال حاضر روی همین پلن هستید' },
    };
  }

  const target = getPlan(planId);
  if (!target) {
    return { success: false, error: { code: 'INVALID_PLAN', message: 'پلن نامعتبر' } };
  }

  // Downgrade to free = cancel
  const isDowngrade = planId === 'free';
  const isUpgrade = !isDowngrade && (fromPlan === 'free' || (fromPlan === 'pro' && planId === 'business'));
  const kind = isDowngrade ? 'CANCEL' : isUpgrade ? 'UPGRADE' : 'DOWNGRADE';

  const amount = isDowngrade
    ? 0
    : billingCycle === 'yearly'
      ? target.yearlyPrice
      : target.monthlyPrice;

  const now = new Date();
  // 30 روز برای ماهانه، 365 روز برای سالانه
  const validUntil = new Date(now);
  if (planId !== 'free') {
    validUntil.setDate(validUntil.getDate() + (billingCycle === 'yearly' ? 365 : 30));
  }

  const invoiceNo = `INV-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

  // Idempotency: اگر در ۵ دقیقه گذشته رویداد PENDING همین پلن داریم، همان را برمی‌گردانیم
  const recent = await prisma.subscriptionEvent.findFirst({
    where: {
      userId: auth.user.id,
      toPlan: planId,
      status: 'PENDING',
      createdAt: { gte: new Date(now.getTime() - 5 * 60_000) },
    },
  });
  if (recent) {
    return {
      success: true,
      data: {
        invoiceNo: recent.invoiceNo ?? '',
        newPlan: planId,
        validUntil: (recent.validUntil ?? validUntil).toISOString(),
      },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.subscriptionEvent.create({
      data: {
        id: createId(),
        userId: auth.user.id,
        kind,
        fromPlan,
        toPlan: planId,
        amount: BigInt(amount),
        currency: target.currency,
        invoiceNo,
        status: isDowngrade ? 'PAID' : 'PAID',
        paymentMethod,
        validUntil: planId === 'free' ? null : validUntil,
        meta: {
          billingCycle,
          ip,
        } as object,
        createdAt: now,
      },
    });
    await tx.auditLog.create({
      data: {
        id: createId(),
        actorId: auth.user.id,
        actorRole: auth.user.role ?? 'USER',
        action: 'PLAN_CHANGED',
        entityType: 'User',
        entityId: auth.user.id,
        ip,
        meta: { fromPlan, toPlan: planId, amount, kind, invoiceNo } as object,
      },
    });
  });

  revalidateTag('subscription');
  revalidateTag('user');

  return {
    success: true,
    data: {
      invoiceNo,
      newPlan: planId,
      validUntil: planId === 'free' ? '' : validUntil.toISOString(),
    },
  };
}
