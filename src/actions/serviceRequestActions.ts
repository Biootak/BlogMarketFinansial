'use server';

import { randomBytes } from 'node:crypto';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { getEmailProviderAsync } from '@/lib/email';
import {
  serviceRequestConfirmationEmail,
  serviceRequestReceiptEmail,
  serviceRequestStatusEmail,
} from '@/lib/email/templates';
import { isPhoneValid, normalizeToE164 } from '@/lib/phone-validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireRole } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { safeCache } from '@/lib/safe-cache';
import type { FintechActionResult } from '@/types/types';
import { Role } from '@prisma/client';
import { headers } from 'next/headers';
import { z } from 'zod';

// ─── getUserProfile ─────────────────────────────────────────────────────────── //
// H9: FintechActionResult — unified type
export async function getUserServiceProfile(): Promise<
  FintechActionResult<{ name: string; phone: string | null; phoneVerified: boolean; email: string }>
> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'برای این عملیات باید وارد حساب شوید' },
    };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phoneNumber: true, email: true },
  });
  if (!user)
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'کاربر یافت نشد' } };
  return {
    success: true,
    data: {
      name: user.name ?? '',
      phone: user.phoneNumber ?? null,
      phoneVerified: !!user.phoneNumber,
      email: user.email,
    },
  };
}

// ─── Service type labels ──────────────────────────────────────────────────── //
const serviceTypeLabels: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  GIFT_CARD: 'خرید گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید ارز دیجیتال',
  CRYPTO_SELL: 'فروش ارز دیجیتال',
  PAYPAL_TRANSFER: 'انتقال پی‌پال / اسکریل',
  OTHER: 'سایر خدمات',
};

// ─── Tracking code — cryptographically random ────────────────────────────── //
function generateTrackingCode(): string {
  const a = randomBytes(4).toString('hex').toUpperCase();
  const b = randomBytes(3).toString('hex').toUpperCase();
  return `BT-${a}-${b}`;
}

// ─── Sanitize input ───────────────────────────────────────────────────────── //
// 2026-07: encode-based approach — جلوگیری از XSS حتی با Unicode escape
function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// ─── Telegram admin notification ─────────────────────────────────────────── //
async function sendTelegramNotification(message: string): Promise<boolean> {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || settings?.telegram;

    if (!botToken || !chatId) return false;

    // 2026-07-28: AbortSignal.timeout() — اگر تلگرام در 5 ثانیه جواب ندهد
    // کل action hang نکند. AbortSignal.timeout از Node 18+ پشتیبانی می‌شود.
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch (err) {
    // #22 fix: خطا را به audit log ثبت می‌کنیم — swallow نمی‌کنیم
    void prisma.systemLog
      .create({
        data: {
          level: 'WARN',
          message: `Telegram notification failed: ${err instanceof Error ? err.message : String(err)}`,
          source: 'ServiceRequest',
        },
      })
      .catch(() => {});
    return false;
  }
}

// ─── Email notification (fire-and-forget, never throws) ──────────────────── //
async function trySendEmail(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    // #23 fix: خطا را به audit log ثبت می‌کنیم — swallow نمی‌کنیم
    void prisma.systemLog
      .create({
        data: {
          level: 'WARN',
          message: `Email notification failed: ${err instanceof Error ? err.message : String(err)}`,
          source: 'ServiceRequest',
        },
      })
      .catch(() => {});
  }
}

// ─── Validation schema ───────────────────────────────────────────────────── //
const ServiceRequestInputSchema = z.object({
  fullName: z.string().min(3).max(100).transform(sanitizeInput).optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isPhoneValid(val), { message: 'شماره تماس معتبر نیست' })
    .transform((val) => (val ? normalizeToE164(val) : val)),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((val) => val || null),
  contactMethod: z.enum(['telegram', 'whatsapp']).optional(),
  idempotencyKey: z.string().uuid().optional().nullable(),
  serviceType: z.enum([
    'INTERNATIONAL_TRANSFER',
    'ONLINE_PAYMENT',
    'TUITION_PAYMENT',
    'FREELANCE_INCOME',
    'SOFTWARE_PURCHASE',
    'GIFT_CARD',
    'CURRENCY_BUY',
    'CURRENCY_SELL',
    'CRYPTO_BUY',
    'CRYPTO_SELL',
    'PAYPAL_TRANSFER',
    'OTHER',
  ]),
  amount: z
    .string()
    .min(1)
    .max(50)
    .refine((v) => /^[\d.,]+$/.test(v), { message: 'مبلغ نامعتبر است' })
    .transform(sanitizeInput),
  currency: z.string().min(1).max(10),
  destinationCountry: z
    .string()
    .optional()
    .transform((val) => val || null),
  bankName: z
    .string()
    .optional()
    .transform((val) => val || null),
  // B1-fix: آدرس کیف پول و شبکه کریپتو قبلاً فقط در تایپ ورودی بودند و در اسکیمای
  // zod نبودند → zod keyهای ناشناخته را strip می‌کرد و داده‌ی مهم کریپتو گم می‌شد.
  walletAddress: z
    .string()
    .max(200)
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : null)),
  cryptoNetwork: z
    .string()
    .max(50)
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : null)),
  websiteUrl: z
    .string()
    .optional()
    .transform((val) => val || null),
  productName: z
    .string()
    .optional()
    .transform((val) => val || null),
  universityName: z
    .string()
    .optional()
    .transform((val) => val || null),
  studentId: z
    .string()
    .optional()
    .transform((val) => val || null),
  platformName: z
    .string()
    .optional()
    .transform((val) => val || null),
  platformUsername: z
    .string()
    .optional()
    .transform((val) => val || null),
  softwareName: z
    .string()
    .optional()
    .transform((val) => val || null),
  subscriptionType: z
    .string()
    .optional()
    .transform((val) => val || null),
  giftCardBrand: z
    .string()
    .optional()
    .transform((val) => val || null),
  giftCardRegion: z
    .string()
    .optional()
    .transform((val) => val || null),
  description: z
    .string()
    .max(500)
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : null)),
  urgency: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
  /// 2026-07-28: درخواست مستقیم از صفحه صرافی — اختیاری.
  targetExchangeId: z.string().min(1).max(40).optional().nullable(),
});

export type ServiceRequestInput = z.infer<typeof ServiceRequestInputSchema>;

export type ServiceRequestClientInput = {
  serviceType: ServiceRequestInput['serviceType'];
  amount: string;
  currency: string;
  urgency?: 'NORMAL' | 'URGENT';
  idempotencyKey?: string | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  contactMethod?: 'telegram' | 'whatsapp';
  destinationCountry?: string | null;
  bankName?: string | null;
  walletAddress?: string | null;
  cryptoNetwork?: string | null;
  platformName?: string | null;
  platformUsername?: string | null;
  softwareName?: string | null;
  subscriptionType?: string | null;
  giftCardBrand?: string | null;
  giftCardRegion?: string | null;
  websiteUrl?: string | null;
  productName?: string | null;
  universityName?: string | null;
  studentId?: string | null;
  description?: string | null;
  /// 2026-07-28: اگر درخواست از صفحه صرافی خاصی ثبت شود، صرافی مقصد اینجاست.
  targetExchangeId?: string | null;
};

// ─── createServiceRequest ─────────────────────────────────────────────────── //
export async function createServiceRequest(
  input: ServiceRequestClientInput,
): Promise<FintechActionResult<{ trackingCode: string }>> {
  try {
    const headersList = await headers();
    const _xff = headersList.get('x-forwarded-for') ?? '';
    const ip =
      _xff
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .pop() ||
      headersList.get('x-real-ip')?.trim() ||
      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    const rateResult = await checkRateLimit(`service-request:${ip}`, 'api');
    if (!rateResult.success) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید.',
        },
      };
    }

    const validationResult = ServiceRequestInputSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: validationResult.error.errors[0].message },
      };
    }

    const data = validationResult.data;

    // B2-fix: کشور مقصد برای حواله بین‌المللی الزامی است — هرگز به کلاینت اعتماد نکن
    if (data.serviceType === 'INTERNATIONAL_TRANSFER' && !data.destinationCountry) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'برای حواله بین‌المللی کشور مقصد الزامی است.',
        },
      };
    }

    // Idempotency check
    if (data.idempotencyKey) {
      const existing = await prisma.serviceRequest.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: { trackingCode: true },
      });
      if (existing) {
        return { success: true, data: { trackingCode: existing.trackingCode } };
      }
    }

    // M9: پنجره duplicate guard به ۳۰ دقیقه (قبلاً ۵ دقیقه بود)
    if (!data.idempotencyKey) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentDuplicate = await prisma.serviceRequest.findFirst({
        where: {
          phone: data.phone,
          amount: data.amount,
          currency: data.currency,
          createdAt: { gte: thirtyMinutesAgo },
        },
        select: { trackingCode: true },
        orderBy: { createdAt: 'desc' },
      });
      if (recentDuplicate) {
        return { success: true, data: { trackingCode: recentDuplicate.trackingCode } };
      }
    }

    const trackingCode = generateTrackingCode();

    const session = await auth();
    const userId = session?.user?.id ?? null;

    let resolvedFullName = data.fullName ?? '';
    let resolvedPhone = data.phone ?? '';
    let resolvedEmail = data.email ?? null;
    const resolvedContactMethod = data.contactMethod ?? 'telegram';

    if (userId) {
      const userRow = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, phoneNumber: true, email: true },
      });
      if (userRow) {
        if (userRow.name) resolvedFullName = userRow.name;
        if (userRow.phoneNumber) resolvedPhone = normalizeToE164(userRow.phoneNumber);
        if (userRow.email) resolvedEmail = userRow.email;
      }
    }

    if (userId && !resolvedPhone) {
      return {
        success: false,
        error: {
          code: 'PHONE_REQUIRED',
          message: 'برای ثبت درخواست باید شماره موبایل خود را در پروفایل تأیید کنید.',
        },
      };
    }

    if (!userId && (!resolvedFullName || !resolvedPhone)) {
      return {
        success: false,
        error: { code: 'MISSING_CONTACT', message: 'نام و شماره تماس الزامی است.' },
      };
    }

    const metadata: Record<string, string | null> = {
      destinationCountry: data.destinationCountry ?? null,
      bankName: data.bankName ?? null,
      websiteUrl: data.websiteUrl ?? null,
      productName: data.productName ?? null,
      universityName: data.universityName ?? null,
      studentId: data.studentId ?? null,
      platformName: data.platformName ?? null,
      platformUsername: data.platformUsername ?? null,
      walletAddress: data.walletAddress ?? null,
      cryptoNetwork: data.cryptoNetwork ?? null,
      softwareName: data.softwareName ?? null,
      subscriptionType: data.subscriptionType ?? null,
      giftCardBrand: data.giftCardBrand ?? null,
      giftCardRegion: data.giftCardRegion ?? null,
    };
    const metadataClean = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v !== null),
    ) as Record<string, string>;

    // C5: همه writeها در یک $transaction
    let resolvedTargetExchangeId: string | null = null;
    const createdRequestId = await prisma.$transaction(async (tx) => {
      // 2026-07-28: validate target exchange exists & active
      let targetExchangeId: string | null = null;
      if (input.targetExchangeId) {
        const exchange = await tx.exchange.findUnique({
          where: { id: input.targetExchangeId },
          select: { id: true, status: true },
        });
        if (exchange && exchange.status === 'ACTIVE') {
          targetExchangeId = exchange.id;
        }
      }
      resolvedTargetExchangeId = targetExchangeId;

      const created = await tx.serviceRequest.create({
        data: {
          trackingCode,
          fullName: resolvedFullName,
          phone: resolvedPhone,
          email: resolvedEmail,
          serviceType: data.serviceType,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          urgency: data.urgency,
          contactMethod: resolvedContactMethod,
          ipAddress: ip,
          userAgent: userAgent.substring(0, 500),
          userId,
          targetExchangeId,
          metadata: Object.keys(metadataClean).length > 0 ? metadataClean : undefined,
          ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
        },
        select: { id: true },
      });

      await tx.systemLog.create({
        data: {
          level: 'INFO',
          message: `New service request: ${trackingCode}${targetExchangeId ? ` (→ exchange ${targetExchangeId})` : ''}`,
          source: 'ServiceRequest',
        },
      });

      return created.id;
    });

    // 2026-07-28: نوتیفیکیشن به صرافی وقتی targetExchangeId تنظیم شده
    // best-effort — اگر fail شد، request ثبت شده و فقط log می‌شود
    if (resolvedTargetExchangeId) {
      const { notifyExchangeOfServiceRequest } = await import('@/lib/notifications/exchange');
      await notifyExchangeOfServiceRequest({
        requestId: createdRequestId,
        trackingCode,
        serviceKey: data.serviceType,
        exchangeId: resolvedTargetExchangeId,
        customerName: resolvedFullName,
        customerPhone: resolvedPhone,
        amount: data.amount,
        currency: data.currency,
        description: data.description ?? null,
        contactMethod: resolvedContactMethod,
        urgency: data.urgency,
      });
    }

    // Telegram notification (fire-and-forget)
    const urgencyLabel = data.urgency === 'URGENT' ? '🔴 فوری' : '⚪ عادی';
    const notificationMessage =
      `*درخواست جدید خدمات*\n\nکد پیگیری: ${trackingCode}\nنام: ${data.fullName}\nتماس: ${data.phone}\n${data.email ? `ایمیل: ${data.email}` : ''}\n\n${serviceTypeLabels[data.serviceType] || data.serviceType}\nمبلغ: ${data.amount} ${data.currency}\nاولویت: ${urgencyLabel}\nروش تماس: ${data.contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'}\n${data.description ? `توضیحات: ${data.description}` : ''}\n\nمشاهده در داشبورد: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/service-requests`.trim();
    await sendTelegramNotification(notificationMessage);

    // H4: resolvedEmail null safety
    if (resolvedEmail) {
      await trySendEmail(async () => {
        const provider = await getEmailProviderAsync();
        await provider.send(
          serviceRequestConfirmationEmail({
            to: resolvedEmail,
            fullName: resolvedFullName,
            trackingCode,
            serviceType: data.serviceType,
            amount: data.amount,
            currency: data.currency,
            appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
          }),
        );
      });
    }

    return { success: true, data: { trackingCode } };
  } catch {
    return {
      success: false,
      error: { code: 'SERVER_ERROR', message: 'خطایی در ثبت درخواست رخ داد.' },
    };
  }
}

// ─── getServiceRequestByTrackingCode ──────────────────────────────────────── //
export async function getServiceRequestByTrackingCode(trackingCode: string): Promise<
  FintechActionResult<{
    trackingCode: string;
    fullName: string;
    serviceType: string;
    amount: string;
    currency: string;
    status: string;
    urgency: string;
    description: string | null;
    contactMethod: string | null;
    estimatedCompletionAt: Date | null;
    externalTxId: string | null;
    createdAt: Date;
    updatedAt: Date;
    statusLogs: Array<{
      fromStatus: string | null;
      toStatus: string;
      note: string | null;
      createdAt: Date;
    }>;
  }>
> {
  // DoS/scan guard — فقط کدهای با فرمت معتبر به دیتابیس می‌رسند
  if (!/^[A-Z0-9][A-Z0-9-]{5,23}$/.test(trackingCode)) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'درخواستی با این کد پیگیری یافت نشد.' },
    };
  }
  // Anti-enumeration — rate limiter مخصوص deal-track (۲۰/دقیقه per IP)
  if (process.env.NODE_ENV === 'production') {
    const headersList = await headers();
    const _xff = headersList.get('x-forwarded-for') ?? '';
    const ip =
      _xff
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .pop() ||
      headersList.get('x-real-ip')?.trim() ||
      'unknown';
    const rl = await checkRateLimit(`deal-track:${ip}`, 'deal-track');
    if (!rl.success) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
        },
      };
    }
  }
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingCode },
      select: {
        trackingCode: true,
        fullName: true,
        serviceType: true,
        amount: true,
        currency: true,
        status: true,
        urgency: true,
        // adminNotes عمداً حذف شد — یادداشت‌های داخلی تیم نباید با کد عمومی لو برود
        description: true,
        contactMethod: true,
        estimatedCompletionAt: true,
        externalTxId: true,
        createdAt: true,
        updatedAt: true,
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          select: { fromStatus: true, toStatus: true, note: true, createdAt: true },
        },
      },
    });

    if (!request) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'درخواستی با این کد پیگیری یافت نشد.' },
      };
    }

    const maskedName = `${request.fullName.charAt(0)}***`;
    return { success: true, data: { ...request, fullName: maskedName } };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── Admin: Get all service requests ──────────────────────────────────────── //
export async function getServiceRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<
  FintechActionResult<{
    requests: unknown[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>
> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  }

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params?.status && params.status !== 'ALL') where.status = params.status;
  if (params?.search) {
    where.OR = [
      { trackingCode: { contains: params.search, mode: 'insensitive' } },
      { fullName: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  try {
    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { notes: true, attachments: true } } },
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    // M1: double nesting removed
    return {
      success: true,
      data: {
        requests: requests as unknown[],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── Admin: Update request status ────────────────────────────────────────── //
export async function updateServiceRequestStatus(
  id: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  adminNotes?: string,
): Promise<FintechActionResult<void>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };

  try {
    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
      select: {
        status: true,
        trackingCode: true,
        fullName: true,
        email: true,
        phone: true,
        serviceType: true,
        amount: true,
        currency: true,
        externalTxId: true,
      },
    });
    if (!existing)
      return { success: false, error: { code: 'NOT_FOUND', message: 'درخواست یافت نشد.' } };

    const request = await prisma.serviceRequest.update({
      where: { id },
      data: { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
    });

    await prisma.serviceRequestStatusLog.create({
      data: {
        requestId: id,
        fromStatus: existing.status,
        toStatus: status,
        changedBy: authCheck.user.id,
        note: adminNotes ?? null,
      },
    });

    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Service request ${request.trackingCode} status updated to ${status} by ${authCheck.user.id}`,
        source: 'ServiceRequest',
      },
    });

    // Notification logic (unchanged)
    const statusEmoji: Record<string, string> = {
      PENDING: '⏳',
      IN_PROGRESS: '🔄',
      COMPLETED: '✅',
      CANCELLED: '❌',
    };
    const statusFa: Record<string, string> = {
      PENDING: 'در انتظار بررسی',
      IN_PROGRESS: 'در حال انجام',
      COMPLETED: 'تکمیل شده',
      CANCELLED: 'لغو شده',
    };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const trackingUrl = `${appUrl}/track/${existing.trackingCode}`;
    const pushMsg =
      `${statusEmoji[status] ?? '📋'} *تغییر وضعیت درخواست*\n\nکد: \\\`${existing.trackingCode}\\\`\nمشتری: ${existing.fullName}\nتماس: ${existing.phone}\nوضعیت جدید: *${statusFa[status] ?? status}*\n${adminNotes ? `یادداشت: ${adminNotes}` : ''}\n${existing.externalTxId ? `شناسه تراکنش: ${existing.externalTxId}` : ''}\n\n🔗 ${trackingUrl}`.trim();
    void sendTelegramNotification(pushMsg);

    if (existing.email) {
      if (status === 'COMPLETED') {
        await trySendEmail(async () => {
          const provider = await getEmailProviderAsync();
          await provider.send(
            serviceRequestReceiptEmail({
              to: existing.email as string,
              fullName: existing.fullName,
              trackingCode: existing.trackingCode,
              serviceType: existing.serviceType,
              amount: existing.amount,
              currency: existing.currency,
              externalTxId: existing.externalTxId,
              adminNote: adminNotes ?? null,
              completedAt: new Date(),
              appUrl,
            }),
          );
        });
      } else {
        await trySendEmail(async () => {
          const provider = await getEmailProviderAsync();
          await provider.send(
            serviceRequestStatusEmail({
              to: existing.email as string,
              fullName: existing.fullName,
              trackingCode: existing.trackingCode,
              newStatus: status,
              adminNote: adminNotes,
              appUrl,
            }),
          );
        });
      }
    }

    revalidateTag('service-requests');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── Admin: Delete request ───────────────────────────────────────────────── //
export async function deleteServiceRequest(id: string): Promise<FintechActionResult<void>> {
  const authCheck = await requireRole([Role.OWNER]);
  if (!authCheck.success)
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'فقط مالک می‌تواند درخواست را حذف کند.' },
    };
  try {
    await prisma.serviceRequest.delete({ where: { id } });
    revalidateTag('service-requests');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── Admin: Get recent activity ──────────────────────────────────────────── //
export async function getServiceRequestRecentActivity(
  limit = 10,
): Promise<FintechActionResult<unknown[]>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  try {
    // #15 fix: allSettled به‌جای all — اگر یک کوئری fail کند، دیگری abort نمی‌شود
    const [statusLogsResult, recentResult] = await Promise.allSettled([
      prisma.serviceRequestStatusLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { request: { select: { trackingCode: true, fullName: true } } },
      }),
      prisma.serviceRequest.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          trackingCode: true,
          fullName: true,
          status: true,
          urgency: true,
          serviceType: true,
          createdAt: true,
        },
      }),
    ]);
    const statusLogs = statusLogsResult.status === 'fulfilled' ? statusLogsResult.value : [];
    const recent = recentResult.status === 'fulfilled' ? recentResult.value : [];

    type Activity =
      | {
          kind: 'created';
          id: string;
          trackingCode: string;
          fullName: string;
          status: string;
          urgency: string;
          serviceType: string;
          createdAt: string;
        }
      | {
          kind: 'status_changed';
          id: string;
          trackingCode: string;
          fromStatus: string | null;
          toStatus: string;
          updatedBy: string;
          createdAt: string;
        };
    const items: Activity[] = [];
    for (const r of recent)
      items.push({
        kind: 'created' as const,
        id: r.id,
        trackingCode: r.trackingCode,
        fullName: r.fullName,
        status: r.status,
        urgency: r.urgency,
        serviceType: r.serviceType,
        createdAt: r.createdAt.toISOString(),
      });
    for (const log of statusLogs)
      items.push({
        kind: 'status_changed' as const,
        id: `log-${log.id}`,
        trackingCode: log.request.trackingCode,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        updatedBy: log.changedBy,
        createdAt: log.createdAt.toISOString(),
      });
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { success: true, data: items.slice(0, limit) };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── Admin: Bulk status update ────────────────────────────────────────────── //
export async function bulkUpdateServiceRequestStatus(
  ids: string[],
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
): Promise<FintechActionResult<{ count: number }>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  if (ids.length === 0)
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'هیچ موردی انتخاب نشده است.' },
    };
  try {
    const existing = await prisma.serviceRequest.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    const result = await prisma.serviceRequest.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    await prisma.serviceRequestStatusLog.createMany({
      data: existing.map((r) => ({
        id: randomBytes(8).toString('hex'),
        requestId: r.id,
        fromStatus: r.status,
        toStatus: status,
        changedBy: authCheck.user.id,
      })),
    });
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Bulk update: ${result.count} requests set to ${status} by ${authCheck.user.id}`,
        source: 'ServiceRequest',
      },
    });
    revalidateTag('service-requests');
    return { success: true, data: { count: result.count } };
  } catch {
    return {
      success: false,
      error: { code: 'SERVER_ERROR', message: 'خطا در به‌روزرسانی گروهی رخ داد.' },
    };
  }
}

// ─── Admin: Export CSV ───────────────────────────────────────────────────── //
export async function exportServiceRequestsCsv(params?: {
  status?: string;
  search?: string;
}): Promise<FintechActionResult<string>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  const where: Record<string, unknown> = {};
  if (params?.status && params.status !== 'ALL') where.status = params.status;
  if (params?.search) {
    where.OR = [
      { trackingCode: { contains: params.search, mode: 'insensitive' } },
      { fullName: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  try {
    // #17 note: take: 1000 آگاهانه است — برای فایل CSV در یک batch.
    // اگر داده‌ها بیش از ۱۰۰۰ شدند، از cursor-based export استفاده کنید.
    const rows = await prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    const header = [
      'کد پیگیری',
      'نام',
      'تلفن',
      'ایمیل',
      'نوع خدمات',
      'مبلغ',
      'ارز',
      'اولویت',
      'روش تماس',
      'وضعیت',
      'تاریخ ثبت',
    ];
    const serviceLabel: Record<string, string> = {
      INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
      ONLINE_PAYMENT: 'پرداخت آنلاین',
      TUITION_PAYMENT: 'پرداخت شهریه',
      FREELANCE_INCOME: 'نقد کردن درآمد',
      SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
      GIFT_CARD: 'گیفت کارت',
      OTHER: 'سایر',
    };
    const statusLabel: Record<string, string> = {
      PENDING: 'در انتظار',
      IN_PROGRESS: 'در حال انجام',
      COMPLETED: 'تکمیل شده',
      CANCELLED: 'لغو شده',
    };
    const escapeCsv = (val: unknown): string => {
      const s = val === null || val === undefined ? '' : String(val);
      return /[\",\n]/.test(s) ? `\"${s.replace(/\"/g, '""')}\"` : s;
    };
    const csvRows: string[] = [header.join(',')];
    for (const r of rows) {
      csvRows.push(
        [
          escapeCsv(r.trackingCode),
          escapeCsv(r.fullName),
          escapeCsv(r.phone),
          escapeCsv(r.email),
          escapeCsv(serviceLabel[r.serviceType] ?? r.serviceType),
          escapeCsv(r.amount),
          escapeCsv(r.currency),
          escapeCsv(r.urgency === 'URGENT' ? 'فوری' : 'عادی'),
          escapeCsv(r.contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'),
          escapeCsv(statusLabel[r.status] ?? r.status),
          escapeCsv(r.createdAt.toISOString()),
        ].join(','),
      );
    }
    return { success: true, data: `\uFEFF${csvRows.join('\n')}` };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطا در ساخت فایل خروجی.' } };
  }
}

// ─── Admin: Get stats ─────────────────────────────────────────────────────── //
export async function getServiceRequestStats(): Promise<
  FintechActionResult<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    todayCount: number;
    urgent: number;
    pendingUrgent: number;
  }>
> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  try {
    const [byStatus, todayCount, urgentCount, pendingUrgentCount] = await Promise.all([
      prisma.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.serviceRequest.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.serviceRequest.count({ where: { urgency: 'URGENT' } }),
      prisma.serviceRequest.count({ where: { urgency: 'URGENT', status: 'PENDING' } }),
    ]);
    const counts: Record<string, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    let total = 0;
    for (const row of byStatus) {
      counts[row.status] = row._count._all;
      total += row._count._all;
    }
    return {
      success: true,
      data: {
        total,
        pending: counts.PENDING,
        inProgress: counts.IN_PROGRESS,
        completed: counts.COMPLETED,
        cancelled: counts.CANCELLED,
        todayCount,
        urgent: urgentCount,
        pendingUrgent: pendingUrgentCount,
      },
    };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── User: Get own service requests ──────────────────────────────────────── //
export async function getMyServiceRequests(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<
  FintechActionResult<{
    requests: unknown[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>
> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'لطفاً وارد حساب کاربری خود شوید.' },
    };
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: { userId: string; status?: import('@prisma/client').ServiceRequestStatus } = {
    userId: session.user.id,
  };
  if (params?.status && params.status !== 'ALL') {
    where.status = params.status as import('@prisma/client').ServiceRequestStatus;
  }
  try {
    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          trackingCode: true,
          serviceType: true,
          amount: true,
          currency: true,
          status: true,
          urgency: true,
          adminNotes: true,
          estimatedCompletionAt: true,
          createdAt: true,
          updatedAt: true,
          statusLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { fromStatus: true, toStatus: true, note: true, createdAt: true },
          },
        },
      }),
      prisma.serviceRequest.count({ where }),
    ]);
    return {
      success: true,
      data: {
        requests: requests as unknown[],
        // Bug-fix: Math.max(1, ...) — وقتی total=0، Math.ceil(0/10)=0 که pagination شکسته می‌شد
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── User: Get own service request stats ──────────────────────────────────── //
export async function getMyServiceRequestStats(): Promise<
  FintechActionResult<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }>
> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'لطفاً وارد حساب کاربری خود شوید.' },
    };
  try {
    const [total, pending, inProgress, completed, cancelled] = await Promise.all([
      prisma.serviceRequest.count({ where: { userId: session.user.id } }),
      prisma.serviceRequest.count({ where: { userId: session.user.id, status: 'PENDING' } }),
      prisma.serviceRequest.count({ where: { userId: session.user.id, status: 'IN_PROGRESS' } }),
      prisma.serviceRequest.count({ where: { userId: session.user.id, status: 'COMPLETED' } }),
      prisma.serviceRequest.count({ where: { userId: session.user.id, status: 'CANCELLED' } }),
    ]);
    return {
      success: true,
      data: { total, pending, inProgress, completed, cancelled },
    };
  } catch {
    return {
      success: false,
      error: { code: 'SERVER_ERROR', message: 'خطایی در دریافت آمار رخ داد.' },
    };
  }
}

// ─── User: Cancel own PENDING request ────────────────────────────────────── //
export async function cancelMyServiceRequest(
  trackingCode: string,
): Promise<FintechActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id)
    return {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'لطفاً وارد حساب کاربری خود شوید.' },
    };
  try {
    const req = await prisma.serviceRequest.findUnique({
      where: { trackingCode },
      select: { id: true, status: true, userId: true, createdAt: true, trackingCode: true },
    });
    if (!req)
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'سفارشی با این کد یافت نشد.' },
      };
    if (req.userId !== session.user.id)
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'این سفارش به حساب شما تعلق ندارد.' },
      };
    if (req.status !== 'PENDING')
      return {
        success: false,
        error: { code: 'INVALID_STATE', message: 'فقط سفارش‌های «در انتظار بررسی» قابل لغو هستند.' },
      };

    const thirtyMinutes = 30 * 60 * 1000;
    const elapsed = Date.now() - new Date(req.createdAt).getTime();
    if (elapsed > thirtyMinutes)
      return {
        success: false,
        error: {
          code: 'CANCEL_WINDOW_EXPIRED',
          message: 'مهلت لغو خودکار (۳۰ دقیقه) پایان یافته. برای لغو با پشتیبانی تماس بگیرید.',
        },
      };

    await prisma.$transaction([
      prisma.serviceRequest.update({ where: { id: req.id }, data: { status: 'CANCELLED' } }),
      prisma.serviceRequestStatusLog.create({
        data: {
          requestId: req.id,
          fromStatus: 'PENDING',
          toStatus: 'CANCELLED',
          changedBy: session.user.email ?? session.user.id,
          note: 'لغو توسط کاربر',
        },
      }),
    ]);
    revalidateTag('service-requests');
    return { success: true, data: undefined };
  } catch (_error) {
    return {
      success: false,
      error: { code: 'SERVER_ERROR', message: 'خطایی در لغو سفارش رخ داد.' },
    };
  }
}

// ─── User: Claim a guest request ────────────────────────────────────────── //
export async function claimGuestRequest(
  trackingCode: string,
): Promise<FintechActionResult<{ requiresOtp?: boolean; email?: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email)
    return {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'لطفاً وارد حساب کاربری خود شوید.' },
    };
  try {
    const req = await prisma.serviceRequest.findUnique({
      where: { trackingCode: trackingCode.trim().toUpperCase() },
      select: { id: true, userId: true, email: true, emailVerified: true },
    });
    if (!req)
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'سفارشی با این کد یافت نشد.' },
      };
    if (req.userId) {
      if (req.userId === session.user.id)
        return {
          success: false,
          error: { code: 'ALREADY_CLAIMED', message: 'این سفارش قبلاً به حساب شما وصل شده است.' },
        };
      return {
        success: false,
        error: { code: 'ALREADY_CLAIMED', message: 'این سفارش به حساب دیگری تعلق دارد.' },
      };
    }
    const reqEmail = req.email?.trim().toLowerCase();
    const userEmail = session.user.email.trim().toLowerCase();
    if (!reqEmail) {
      // #10+11 fix: $transaction برای atomicity — جلوگیری از race condition
      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.serviceRequest.findUnique({
            where: { id: req.id },
            select: { userId: true },
          });
          if (fresh?.userId) throw new Error('ALREADY_CLAIMED');
          await tx.serviceRequest.update({
            where: { id: req.id },
            data: { userId: session.user.id },
          });
        });
      } catch (txErr) {
        // Bug-fix: ALREADY_CLAIMED از throw داخل transaction — باید پیام دقیق برگردد
        if (txErr instanceof Error && txErr.message === 'ALREADY_CLAIMED') {
          return {
            success: false,
            error: {
              code: 'ALREADY_CLAIMED',
              message: 'این سفارش قبلاً توسط حساب دیگری ادعا شده است.',
            },
          };
        }
        return {
          success: false,
          error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد. دوباره تلاش کنید.' },
        };
      }
      revalidateTag('service-requests');
      return { success: true, data: {} };
    }
    if (reqEmail !== userEmail)
      return {
        success: false,
        error: {
          code: 'EMAIL_MISMATCH',
          message: 'ایمیل این سفارش با ایمیل حساب شما مطابقت ندارد.',
        },
      };
    if (req.emailVerified) {
      // #10+11 fix: $transaction برای atomicity — جلوگیری از race condition
      try {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.serviceRequest.findUnique({
            where: { id: req.id },
            select: { userId: true },
          });
          if (fresh?.userId) throw new Error('ALREADY_CLAIMED');
          await tx.serviceRequest.update({
            where: { id: req.id },
            data: { userId: session.user.id },
          });
        });
      } catch (txErr) {
        // Bug-fix: ALREADY_CLAIMED از throw داخل transaction — باید پیام دقیق برگردد
        if (txErr instanceof Error && txErr.message === 'ALREADY_CLAIMED') {
          return {
            success: false,
            error: {
              code: 'ALREADY_CLAIMED',
              message: 'این سفارش قبلاً توسط حساب دیگری ادعا شده است.',
            },
          };
        }
        return {
          success: false,
          error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد. دوباره تلاش کنید.' },
        };
      }
      revalidateTag('service-requests');
      return { success: true, data: {} };
    }
    return { success: true, data: { requiresOtp: true, email: reqEmail } };
  } catch {
    return {
      success: false,
      error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد. دوباره تلاش کنید.' },
    };
  }
}

// ─── Admin: Get full request detail ──────────────────────────────────────── //
export async function getServiceRequestDetail(id: string): Promise<FintechActionResult<unknown>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        // #12 fix: take اضافه شد — بدون limit داده‌های unbounded بارگذاری می‌شدند
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        notes: { orderBy: { createdAt: 'desc' }, take: 100 },
        attachments: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!request)
      return { success: false, error: { code: 'NOT_FOUND', message: 'درخواست یافت نشد.' } };
    return { success: true, data: request };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطایی رخ داد.' } };
  }
}

// ─── Rest of file remains the same ───────────────────────────────────────── //

export async function addServiceRequestNote(
  requestId: string,
  content: string,
  isPrivate = true,
): Promise<FintechActionResult<void>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  const trimmed = content.trim().replace(/[<>]/g, '');
  if (!trimmed || trimmed.length < 2 || trimmed.length > 2000)
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'متن یادداشت باید بین ۲ تا ۲۰۰۰ کاراکتر باشد.' },
    };
  try {
    const req = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    });
    if (!req) return { success: false, error: { code: 'NOT_FOUND', message: 'درخواست یافت نشد.' } };
    await prisma.serviceRequestNote.create({
      data: { requestId, authorId: authCheck.user.id, body: trimmed, isPrivate },
    });
    prisma.systemLog
      .create({
        data: {
          level: 'INFO',
          message: `Note added to service request ${requestId} by ${authCheck.user.id}`,
          source: 'ServiceRequest',
        },
      })
      .catch(() => {});
    revalidateTag('service-requests');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطا در ثبت یادداشت.' } };
  }
}

export async function addServiceRequestAttachment(input: {
  requestId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  fileHash?: string;
  label?: string;
}): Promise<FintechActionResult<void>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN, Role.SUPPORT]);
  if (!authCheck.success)
    return { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } };
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (!ALLOWED_TYPES.includes(input.fileType))
    return {
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'نوع فایل مجاز نیست. فقط تصویر یا PDF قابل پیوست است.',
      },
    };
  if (input.fileSize > 10 * 1024 * 1024)
    return {
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'حجم فایل بیش از ۱۰ مگابایت است.' },
    };
  try {
    const req = await prisma.serviceRequest.findUnique({
      where: { id: input.requestId },
      select: { id: true },
    });
    if (!req) return { success: false, error: { code: 'NOT_FOUND', message: 'درخواست یافت نشد.' } };
    await prisma.serviceRequestAttachment.create({
      data: {
        requestId: input.requestId,
        uploadedById: authCheck.user.id,
        fileName: input.fileName.substring(0, 255),
        fileType: input.fileType,
        fileSize: input.fileSize,
        url: input.url,
        fileHash: input.fileHash ?? null,
        label: input.label?.substring(0, 100) ?? null,
      },
    });
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Attachment added to service request ${input.requestId} by ${authCheck.user.id}: ${input.fileName}`,
        source: 'ServiceRequest',
      },
    });
    revalidateTag('service-requests');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطا در ثبت پیوست.' } };
  }
}

export async function deleteServiceRequestAttachment(
  attachmentId: string,
): Promise<FintechActionResult<void>> {
  const authCheck = await requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN]);
  if (!authCheck.success)
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'فقط ادمین یا مالک می‌توانند پیوست را حذف کنند.' },
    };
  try {
    const att = await prisma.serviceRequestAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, requestId: true, fileName: true },
    });
    if (!att) return { success: false, error: { code: 'NOT_FOUND', message: 'پیوست یافت نشد.' } };
    await prisma.serviceRequestAttachment.delete({ where: { id: attachmentId } });
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Attachment ${att.fileName} deleted from request ${att.requestId} by ${authCheck.user.id}`,
        source: 'ServiceRequest',
      },
    });
    revalidateTag('service-requests');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: { code: 'SERVER_ERROR', message: 'خطا در حذف پیوست.' } };
  }
}

const _getCachedSupportLinks = safeCache(
  async () => {
    const links = await prisma.socialLink.findMany({ where: { isActive: true, type: 'SUPPORT' } });
    const telegram =
      links.find((l) => ['telegram', 'تلگرام'].includes(l.name.toLowerCase()))?.url ?? null;
    const whatsapp =
      links.find((l) => ['whatsapp', 'واتساپ'].includes(l.name.toLowerCase()))?.url ?? null;
    return { telegram, whatsapp };
  },
  { telegram: null, whatsapp: null },
  { key: 'support-contact-links-v1', ttl: 600, tags: ['sidebar-data'] },
);

export async function getSupportContactLinks() {
  try {
    return await _getCachedSupportLinks();
  } catch {
    return { telegram: null, whatsapp: null };
  }
}
