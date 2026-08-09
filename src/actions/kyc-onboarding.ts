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

import { createHash } from 'node:crypto';
import prisma from '@/lib/db';
import { notifyTelegramUser } from '@/lib/notifications/telegram-user';
import { requireAdmin, requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { getPortalUrl } from '@/lib/telegram';
import { normalizeDigits } from '@/lib/utils';
import type { FintechActionResult } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// helper: ثبت AuditLog برای KYC (exchangeId اختیاری چون KYC سایت-wide است)
async function logKycAudit(params: {
  actorId: string;
  actorRole: 'USER' | 'ADMIN';
  action: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  // KYC یک عملیات سراسری (نه مختص صرافی) است — exchangeId باید null باشد.
  // مقدار 'PLATFORM' یک FK violation می‌دهد چون Exchange با آن id وجود ندارد.
  await prisma.auditLog.create({
    data: {
      id: createId(),
      exchangeId: null,
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: 'KycRecord',
      entityId: params.entityId,
      meta: (params.meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}

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
  // dateOfBirth قبل از validation normalize می‌شود — هم ASCII هم فارسی قبول می‌شود
  dateOfBirth: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ: ۱۴۰۰/۰۱/۰۱'),
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^[\d+\-\s]+$/, 'شماره تلفن نامعتبر'),
});

export async function submitKycBasicInfo(
  raw: unknown,
): Promise<FintechActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'وارد حساب کاربری شوید' } };
  }

  // normalize ارقام فارسی/عربی به ASCII قبل از validation — defense-in-depth
  let normalizedRaw = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    normalizedRaw = {
      ...r,
      dateOfBirth:
        typeof r.dateOfBirth === 'string' ? normalizeDigits(r.dateOfBirth) : r.dateOfBirth,
      nationalId: typeof r.nationalId === 'string' ? normalizeDigits(r.nationalId) : r.nationalId,
      phone: typeof r.phone === 'string' ? normalizeDigits(r.phone) : r.phone,
    };
  }

  const parsed = BasicInfoSchema.safeParse(normalizedRaw);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'خطا' },
    };
  }

  const { fullName, nationalId, dateOfBirth: _dob, phone: _phone } = parsed.data;

  // Hash شناسه ملی قبل از ذخیره (privacy-first)
  const nationalIdHash = createHash('sha256').update(`${auth.user.id}:${nationalId}`).digest('hex');

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

  await logKycAudit({
    actorId: auth.user.id,
    actorRole: 'USER',
    action: 'KYC_BASIC_INFO_SUBMITTED',
    entityId: id,
    meta: { fullName },
  });

  return { success: true, data: { id } };
}

// ─── STEP 2: آپلود مدارک ───────────────────────────────────────────────────

// helper: URL کامل S3 (https://) یا local path نسبی (/uploads/) را قبول می‌کند.
// وقتی S3 در دسترس است (production) مقدار absolute HTTPS است.
// وقتی S3 در دسترس نیست (dev / S3 down) مقدار /uploads/kyc/... است.
// هر دو حالت از /api/upload route می‌آیند و امن هستند.
const kycUrlField = (label: string) =>
  z
    .string()
    .min(1, `${label} الزامی است`)
    .refine(
      (v) => v.startsWith('https://') || v.startsWith('/uploads/'),
      `آدرس ${label} نامعتبر است`,
    );

const DocumentsSchema = z.object({
  selfieUrl: kycUrlField('عکس سلفی'),
  docFrontUrl: kycUrlField('تصویر روی مدرک'),
  docBackUrl: kycUrlField('تصویر پشت مدرک').optional(),
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

  await logKycAudit({
    actorId: auth.user.id,
    actorRole: 'USER',
    action: 'KYC_DOCUMENTS_SUBMITTED',
    entityId: record.id,
    meta: {
      hasSelfie: !!parsed.data.selfieUrl,
      hasFront: !!parsed.data.docFrontUrl,
      hasBack: !!parsed.data.docBackUrl,
    },
  });

  return { success: true, data: undefined };
}

// ─── ADMIN: REVIEW ─────────────────────────────────────────────────────────

const ReviewSchema = z.object({
  userId: z.string().min(1),
  approved: z.boolean(),
  rejectedReason: z.string().max(500).optional(),
  /** مدت انقضای KYC به ماه — پیش‌فرض ۲۴ ماه (۲ سال) */
  expiryMonths: z.number().int().min(1).max(120).default(24),
});

// KYC_EXPIRY_MONTHS: انقضای پیش‌فرض ۲ سال — قابل override در ReviewSchema
const KYC_DEFAULT_EXPIRY_MONTHS = 24;

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

  const { userId, approved, rejectedReason, expiryMonths } = parsed.data;

  if (!approved && !rejectedReason) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'دلیل رد باید ذکر شود' },
    };
  }

  // Progression gate: نمی‌توان KYC را approve کرد مگر اینکه مدارک ارسال شده باشند
  const existingRecord = await prisma.kycRecord.findUnique({
    where: { userId },
    select: { id: true, submittedAt: true, selfieUrl: true, docFrontUrl: true },
  });

  if (!existingRecord) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'پرونده KYC یافت نشد' } };
  }

  if (approved) {
    // هر دو شرط باید برقرار باشند: submittedAt + حداقل یک مدرک
    if (!existingRecord.submittedAt || !existingRecord.docFrontUrl) {
      return {
        success: false,
        error: {
          code: 'PREREQUISITE',
          message: 'تأیید KYC ممکن نیست — کاربر هنوز مدارک خود را ارسال نکرده است',
        },
      };
    }
  }

  // محاسبه تاریخ انقضا — فقط هنگام approve
  const now = new Date();
  const expiresAt = approved
    ? new Date(
        now.getFullYear(),
        now.getMonth() + (expiryMonths ?? KYC_DEFAULT_EXPIRY_MONTHS),
        now.getDate(),
      )
    : null;

  // KYC review + Customer.kycStatus sync در یک transaction
  const updatedRecord = await prisma.$transaction(async (tx) => {
    const record = await tx.kycRecord.update({
      where: { userId },
      data: {
        reviewedAt: now,
        rejectedReason: approved ? null : (rejectedReason ?? null),
        ...(expiresAt ? { expiresAt } : {}),
        updatedAt: now,
      },
      select: { id: true },
    });

    // sync Customer.kycStatus — اگر Customer record برای این user وجود دارد
    // (ممکن است کاربر عادی KYC بدهد ولی هنوز Customer نشده باشد — skip)
    const newKycStatus = approved ? 'APPROVED' : 'REJECTED';
    await tx.customer.updateMany({
      where: { userId },
      data: { kycStatus: newKycStatus, updatedAt: now },
    });

    return record;
  });

  revalidateTag('kyc');
  revalidateTag('wallet');
  revalidateTag('dashboard-stats');

  await logKycAudit({
    actorId: auth.user.id,
    actorRole: 'ADMIN',
    action: approved ? 'KYC_APPROVED' : 'KYC_REJECTED',
    entityId: updatedRecord.id,
    meta: {
      targetUserId: userId,
      approved,
      ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
      ...(rejectedReason ? { rejectedReason } : {}),
    },
  });

  // نوتیفیکیشن برای کاربر — بفهمد نتیجه KYC چه شد.
  // اگر reject: باید بتواند مسیر ارسال مجدد را در UI ببیند.
  try {
    const { createNotification } = await import('@/actions/notification-actions');
    await createNotification(
      userId,
      approved
        ? '✅ احراز هویت شما تأیید شد. اکنون به تمام امکانات دسترسی دارید.'
        : `❌ احراز هویت رد شد. دلیل: ${rejectedReason ?? 'نامشخص'}. لطفاً مدارک را اصلاح و ارسال مجدد کنید.`,
    );
  } catch {
    // best-effort: اگر نوتیفیکیشن fail شد، audit log ثبت شده و نباید کل عملیات fail شود
  }

  // اعلان تلگرام به خود کاربر (وعدهٔ طراحی: «اعلان‌های حساب به همین گفتگو»)
  const kycBtn = {
    inlineKeyboard: [[{ text: '📂 پنل احراز هویت', url: getPortalUrl('/customer/kyc') }]],
  };
  const kycMsg = approved
    ? '🛡️ <b>احراز هویت شما تأیید شد</b>\n\n✅ اکنون به تمام امکانات دسترسی دارید.'
    : `❌ <b>احراز هویت رد شد</b>\n\nدلیل: <b>${rejectedReason ?? 'نامشخص'}</b>\n\nلطفاً مدارک را اصلاح و دوباره ارسال کنید.`;
  void notifyTelegramUser(userId, kycMsg, kycBtn, {
    dedupeKey: `kyc-review:${userId}:${updatedRecord.id}`,
  });

  return { success: true, data: undefined };
}
