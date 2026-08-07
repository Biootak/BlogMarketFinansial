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

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { type PlanId, getPlan } from '@/lib/subscription-plans';
import type { FintechActionResult } from '@/types/types';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

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

  const _xff = (await headers()).get('x-forwarded-for') ?? '';
  const ip = (_xff.split(',').map((p) => p.trim()).filter(Boolean).pop()) ?? (await headers()).get('x-real-ip')?.trim() ?? 'unknown';
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
  const isUpgrade =
    !isDowngrade && (fromPlan === 'free' || (fromPlan === 'pro' && planId === 'business'));
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
