'use server';

/**
 * virtual-card.ts — Server Actions برای کارت مجازی (VirtualCard)
 *
 * جریان:
 *   کاربر → getMyVirtualCards (مشاهده کارت‌های موجود)
 *   کاربر → issueVirtualCard (صدور کارت جدید)
 *   کاربر → freezeVirtualCard (فریز/آنفریز کارت)
 *   کاربر → cancelVirtualCard (لغو دائمی)
 *
 * امنیت:
 *   - requireUser برای همه عملیات
 *   - فقط کارت‌های خود کاربر
 *   - AuditLog برای صدور و لغو
 *
 * walletId: VirtualCard.walletId در schema هیچ @relation به Wallet ندارد (فقط @@index).
 *   پس FK constraint در DB وجود ندارد. از sentinel `virtual:{userId}` استفاده می‌شود.
 */

import { randomInt } from 'node:crypto';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import type { FintechActionResult } from '@/types/types';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

export type VirtualCardRow = {
  id: string;
  label: string | null;
  last4: string;
  brand: string;
  status: string;
  balance: string;
  currency: string;
  expiresAt: string;
  createdAt: string;
};

// ─── GET MY CARDS ─────────────────────────────────────────────────────────────

export async function getMyVirtualCards(): Promise<VirtualCardRow[]> {
  const auth = await requireUser();
  if (!auth.success) return [];

  const cards = await prisma.virtualCard.findMany({
    where: { userId: auth.user.id, status: { not: 'BLOCKED' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      label: true,
      last4: true,
      brand: true,
      status: true,
      balance: true,
      currency: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return cards.map((c) => ({
    id: c.id,
    label: c.label,
    last4: c.last4,
    brand: c.brand,
    status: c.status,
    balance: c.balance.toString(),
    currency: c.currency,
    expiresAt: c.expiresAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
  }));
}

// ─── ISSUE CARD ───────────────────────────────────────────────────────────────

const IssueCardSchema = z.object({
  label: z.string().max(50).optional(),
  currency: z.enum(['USD', 'EUR', 'AFN', 'IRR']).default('USD'),
});

export async function issueVirtualCard(raw: unknown): Promise<FintechActionResult<VirtualCardRow>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = IssueCardSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { label, currency } = parsed.data;

  // R1-fix: resolve صحیح Customer از userId.
  // FintechAccount.customerId کلید خارجی به Customer.id است، نه User.id.
  // کوئری قبلی `customerId: auth.user.id` همیشه null برمی‌گرداند (NO_ACCOUNT)
  // و در صورت تطابق تصادفی idها بین User و Customer، ریسک IDOR داشت.
  // الگوی استاندارد: اول customer را از userId پیدا کن، سپس account را با customerId.
  const customer = await prisma.customer.findFirst({
    where: { userId: auth.user.id },
    select: { id: true },
  });

  if (!customer) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: 'پروفایل مشتری یافت نشد' },
    };
  }

  const account = await prisma.fintechAccount.findFirst({
    where: { customerId: customer.id, currency, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!account) {
    return {
      success: false,
      error: { code: 'NO_ACCOUNT', message: `حساب ${currency} یافت نشد` },
    };
  }

  // حداکثر ۳ کارت فعال در یک زمان
  const activeCount = await prisma.virtualCard.count({
    where: { userId: auth.user.id, status: 'ACTIVE' },
  });

  if (activeCount >= 3) {
    return {
      success: false,
      error: { code: 'LIMIT_REACHED', message: 'حداکثر ۳ کارت مجازی فعال مجاز است' },
    };
  }

  // تولید last4 تصادفی — randomInt cryptographic به جای Math.random (ضد پیش‌بینی)
  const last4 = randomInt(1000, 10000).toString();

  // انقضا ۲ سال از الان
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 2);

  const now = new Date();
  const id = createId();

  const card = await prisma.virtualCard.create({
    data: {
      id,
      accountId: account.id,
      userId: auth.user.id,
      label: label ?? null,
      last4,
      brand: 'VISA',
      status: 'ACTIVE',
      balance: BigInt(0),
      currency,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    },
    select: {
      id: true,
      label: true,
      last4: true,
      brand: true,
      status: true,
      balance: true,
      currency: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: 'PLATFORM',
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'VIRTUAL_CARD_ISSUED',
      entityType: 'VirtualCard',
      entityId: id,
      meta: { currency, last4 },
    },
  });

  return {
    success: true,
    data: {
      id: card.id,
      label: card.label,
      last4: card.last4,
      brand: card.brand,
      status: card.status,
      balance: card.balance.toString(),
      currency: card.currency,
      expiresAt: card.expiresAt.toISOString(),
      createdAt: card.createdAt.toISOString(),
    },
  };
}

// ─── FREEZE / UNFREEZE ────────────────────────────────────────────────────────

export async function toggleFreezeCard(
  cardId: string,
  freeze: boolean,
): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const card = await prisma.virtualCard.findFirst({
    where: { id: cardId, userId: auth.user.id },
    select: { id: true, status: true },
  });

  if (!card) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'کارت یافت نشد' } };
  }

  if (card.status === 'BLOCKED') {
    return { success: false, error: { code: 'INVALID_STATUS', message: 'کارت مسدود شده است' } };
  }

  await prisma.virtualCard.update({
    where: { id: cardId },
    data: { status: freeze ? 'FROZEN' : 'ACTIVE', updatedAt: new Date() },
  });

  return { success: true, data: undefined };
}

// ─── CANCEL ───────────────────────────────────────────────────────────────────

export async function cancelVirtualCard(cardId: string): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const card = await prisma.virtualCard.findFirst({
    where: { id: cardId, userId: auth.user.id },
    select: { id: true, status: true },
  });

  if (!card) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'کارت یافت نشد' } };
  }

  await prisma.virtualCard.update({
    where: { id: cardId },
    data: { status: 'BLOCKED', updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: 'PLATFORM',
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'VIRTUAL_CARD_CANCELLED',
      entityType: 'VirtualCard',
      entityId: cardId,
    },
  });

  return { success: true, data: undefined };
}
