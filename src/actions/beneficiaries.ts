'use server';

/**
 * beneficiaries.ts — مدیریت دریافت‌کنندگان مکرر کاربر
 *
 * هر کاربر می‌تواند لیست مخاطبان انتقال خود را ذخیره کند.
 * امنیت: هر کاربر فقط به beneficiaries خودش دسترسی دارد.
 */

import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BeneficiaryRow = {
  id: string;
  name: string;
  identifier: string;
  note: string | null;
  createdAt: Date;
};

// ─── READ ─────────────────────────────────────────────────────────────────────

export async function getMyBeneficiaries(): Promise<BeneficiaryRow[]> {
  const auth = await requireUser();
  if (!auth.success) return [];

  const rows = await prisma.beneficiary.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, identifier: true, note: true, createdAt: true },
  });

  return rows;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  name: z.string().min(2, 'نام حداقل ۲ کاراکتر باشد').max(80),
  identifier: z
    .string()
    .min(4, 'شناسه حداقل ۴ کاراکتر باشد')
    .max(60)
    .regex(/^[\d+\-\s@.]+$/, 'شناسه باید شماره تلفن یا آدرس معتبر باشد'),
  note: z.string().max(200).optional(),
});

export async function createBeneficiary(
  raw: unknown,
): Promise<FintechActionResult<BeneficiaryRow>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message ?? 'خطای اعتبارسنجی',
      },
    };
  }

  const { name, identifier, note } = parsed.data;

  const existing = await prisma.beneficiary.findUnique({
    where: { userId_identifier: { userId: auth.user.id, identifier } },
  });
  if (existing) {
    return {
      success: false,
      error: { code: 'DUPLICATE', message: 'این شناسه قبلاً اضافه شده است' },
    };
  }

  const row = await prisma.beneficiary.create({
    data: { id: createId(), userId: auth.user.id, name, identifier, note: note ?? null },
    select: { id: true, name: true, identifier: true, note: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: null,
      actorId: auth.user.id,
      actorRole: 'USER',
      action: 'BENEFICIARY_CREATED',
      entityType: 'Beneficiary',
      entityId: row.id,
      meta: { name, identifier } as Prisma.InputJsonValue,
    },
  });

  revalidateTag('beneficiaries');
  return { success: true, data: row };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80).optional(),
  note: z.string().max(200).optional().nullable(),
});

export async function updateBeneficiary(raw: unknown): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { id, name, note } = parsed.data;

  const row = await prisma.beneficiary.findFirst({ where: { id, userId: auth.user.id } });
  if (!row) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'مخاطب یافت نشد' } };
  }

  await prisma.beneficiary.update({
    where: { id },
    data: { ...(name ? { name } : {}), note: note ?? null },
  });

  revalidateTag('beneficiaries');
  return { success: true, data: undefined };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteBeneficiary(id: string): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const row = await prisma.beneficiary.findFirst({ where: { id, userId: auth.user.id } });
  if (!row) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'مخاطب یافت نشد' } };
  }

  await prisma.beneficiary.delete({ where: { id } });
  revalidateTag('beneficiaries');
  return { success: true, data: undefined };
}
