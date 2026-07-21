'use server';

/**
 * kyc-onboarding.ts — Server Actions برای KYC onboarding کاربر عمومی
 *
 * جریان:
 *   کاربر → submitKycRecord (LEVEL_1: اطلاعات پایه)
 *   کاربر → submitKycDocuments (LEVEL_2: تصاویر مدارک)
 *   ادمین → reviewKycRecord (APPROVED/REJECTED)
 *
 * امنیت:
 *   - هر کاربر فقط KYC خودش را می‌بیند/ویرایش می‌کند
 *   - nationalIdHash قبل از ذخیره hash می‌شود (privacy)
 *   - LEVEL_3 فقط توسط ادمین ثبت می‌شود
 */

import prisma from '@/lib/db';
import { requireAdmin, requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { createHash } from 'node:crypto';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type KycRecordRow = {
  id: string;
  fullName: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  rejectedReason: string | null;
  selfieUrl: string | null;
  docFrontUrl: string | null;
  docBackUrl: string | null;
  status: KycStatus;
};

// ─── GET CURRENT KYC ─────────────────────────────────────────────────────────

export async function getMyKycRecord(): Promise<KycRecordRow | null> {
  const auth = await requireUser();
  if (!auth.success) return null;

  const record = await prisma.kycRecord.findUnique({
    where: { userId: auth.user.id },
    select: {
      id: true,
      fullName: true,
      submittedAt: true,
      reviewedAt: true,
      rejectedReason: true,
      selfieUrl: true,
      docFrontUrl: true,
      docBackUrl: true,
    },
  });

  if (!record) return null;

  // تعیین وضعیت بر اساس فیلدها
  let status: KycStatus = 'NONE';
  if (record.submittedAt && !record.reviewedAt) status = 'PENDING';
  else if (record.reviewedAt && record.rejectedReason) status = 'REJECTED';
  else if (record.reviewedAt && !record.rejectedReason) status = 'APPROVED';
  else if (record.fullName) status = 'PENDING';

  return { ...record, status };
}

// ─── STEP 1: اطلاعات پایه ──────────────────────────────────────────────────

const BasicInfoSchema = z.object({
  fullName: z.string().min(3, 'نام کامل حداقل ۳ کاراکتر').max(100),
  nationalId: z.string().min(8, 'شناسه ملی نامعتبر').max(20),
  dateOfBirth: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ: ۱۴۰۰/۰۱/۰۱'),
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^[\d+\-\s]+$/, 'شماره تلفن نامعتبر'),
});

export async function submitKycBasicInfo(raw: unknown): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = BasicInfoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { fullName, nationalId, dateOfBirth: _dob, phone: _phone } = parsed.data;

  // Hash شناسه ملی قبل از ذخیره (privacy-first)
  const nationalIdHash = createHash('sha256')
    .update(`${auth.user.id}:${nationalId}`)
    .digest('hex');

  // بررسی تکرار شناسه ملی در سیستم
  const existing = await prisma.kycRecord.findFirst({
    where: { nationalIdHash, NOT: { userId: auth.user.id } },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      error: { code: 'DUPLICATE_ID', message: 'این شناسه ملی قبلاً در سیستم ثبت شده است' },
    };
  }

  const now = new Date();
  const id = createId();

  await prisma.kycRecord.upsert({
    where: { userId: auth.user.id },
    create: {
      id,
      userId: auth.user.id,
      fullName,
      nationalIdHash,
      updatedAt: now,
    },
    update: {
      fullName,
      nationalIdHash,
      rejectedReason: null,
      reviewedAt: null,
      updatedAt: now,
    },
  });

  revalidateTag('kyc');
  return { success: true, data: { id } };
}

// ─── STEP 2: آپلود مدارک ───────────────────────────────────────────────────

const DocumentsSchema = z.object({
  selfieUrl: z.string().url('آدرس عکس سلفی نامعتبر'),
  docFrontUrl: z.string().url('آدرس تصویر روی مدرک نامعتبر'),
  docBackUrl: z.string().url('آدرس تصویر پشت مدرک نامعتبر').optional(),
});

export async function submitKycDocuments(raw: unknown): Promise<FintechActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  const parsed = DocumentsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const record = await prisma.kycRecord.findUnique({
    where: { userId: auth.user.id },
    select: { id: true, fullName: true },
  });

  if (!record?.fullName) {
    return {
      success: false,
      error: { code: 'PREREQUISITE', message: 'ابتدا اطلاعات پایه را تکمیل کنید' },
    };
  }

  await prisma.kycRecord.update({
    where: { userId: auth.user.id },
    data: {
      selfieUrl: parsed.data.selfieUrl,
      docFrontUrl: parsed.data.docFrontUrl,
      docBackUrl: parsed.data.docBackUrl ?? null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  revalidateTag('kyc');
  return { success: true, data: undefined };
}

// ─── ADMIN: REVIEW ─────────────────────────────────────────────────────────

const ReviewSchema = z.object({
  userId: z.string().min(1),
  approved: z.boolean(),
  rejectedReason: z.string().max(500).optional(),
});

export async function reviewKycRecord(raw: unknown): Promise<FintechActionResult<void>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'دسترسی غیرمجاز' } };
  }

  const parsed = ReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { userId, approved, rejectedReason } = parsed.data;

  if (!approved && !rejectedReason) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'دلیل رد باید ذکر شود' },
    };
  }

  await prisma.kycRecord.update({
    where: { userId },
    data: {
      reviewedAt: new Date(),
      rejectedReason: approved ? null : (rejectedReason ?? null),
      updatedAt: new Date(),
    },
  });

  revalidateTag('kyc');
  return { success: true, data: undefined };
}
