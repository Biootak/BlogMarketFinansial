'use server';

import prisma from '@/lib/db';
import { headers } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getEmailProviderAsync } from '@/lib/email';
import {
  serviceRequestConfirmationEmail,
  serviceRequestStatusEmail,
  serviceRequestReceiptEmail,
} from '@/lib/email/templates';
import { isPhoneValid, normalizeToE164 } from '@/lib/phone-validation';

// ─── getUserProfile ─────────────────────────────────────────────────────────── //
// اطلاعات کاربر لاگین‌شده را برای pre-fill + auto-fill درخواست سرویس می‌آورد.
export async function getUserServiceProfile(): Promise<{
  success: true;
  name: string;
  phone: string | null;
  phoneVerified: boolean;
  email: string;
} | { success: false; error: 'UNAUTHENTICATED' }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'UNAUTHENTICATED' };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phoneNumber: true, email: true },
  });
  if (!user) return { success: false, error: 'UNAUTHENTICATED' };
  return {
    success: true,
    name: user.name ?? '',
    phone: user.phoneNumber ?? null,
    // phoneVerified: شماره در DB ثبت شده → کافی است (تأیید SMS در آینده)
    phoneVerified: !!user.phoneNumber,
    email: user.email,
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
// 2026-07-07: replaced Math.random()-based generator with crypto.randomBytes
// to eliminate predictability. Format: BT-<8 hex chars>-<6 hex chars>
function generateTrackingCode(): string {
  const a = randomBytes(4).toString('hex').toUpperCase();
  const b = randomBytes(3).toString('hex').toUpperCase();
  return `BT-${a}-${b}`;
}

// ─── Sanitize input ───────────────────────────────────────────────────────── //
function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim();
}

// ─── Telegram admin notification ─────────────────────────────────────────── //
async function sendTelegramNotification(message: string): Promise<boolean> {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || settings?.telegram;

    if (!botToken || !chatId) return false;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// ─── Email notification (fire-and-forget, never throws) ──────────────────── //
async function trySendEmail(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // Email failure must not block the main flow — error swallowed intentionally
  }
}

// ─── Validation schema ───────────────────────────────────────────────────── //
const ServiceRequestInputSchema = z.object({
  // 2026-07-19: fullName/phone/email/contactMethod از session می‌آیند نه از فرم.
  // برای backward compat با callers قدیمی هنوز optional هستند؛
  // اگه session داشتیم مقادیر session override می‌کند.
  fullName: z.string().min(3).max(100).transform(sanitizeInput).optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isPhoneValid(val), { message: 'شماره تماس معتبر نیست' })
    .transform((val) => (val ? normalizeToE164(val) : val)),
  email: z.string().email().optional().or(z.literal('')).transform((val) => val || null),
  contactMethod: z.enum(['telegram', 'whatsapp']).optional(),
  // 2026-07-10: client-generated UUIDv4 for idempotency (prevents duplicate on retry)
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
  amount: z.string().min(1).max(50).transform(sanitizeInput),
  currency: z.string().min(1).max(10),
  // service-specific fields collected as loose strings
  destinationCountry: z.string().optional().transform((val) => val || null),
  bankName: z.string().optional().transform((val) => val || null),
  websiteUrl: z.string().optional().transform((val) => val || null),
  productName: z.string().optional().transform((val) => val || null),
  universityName: z.string().optional().transform((val) => val || null),
  studentId: z.string().optional().transform((val) => val || null),
  platformName: z.string().optional().transform((val) => val || null),
  platformUsername: z.string().optional().transform((val) => val || null),
  softwareName: z.string().optional().transform((val) => val || null),
  subscriptionType: z.string().optional().transform((val) => val || null),
  // Gift Card fields
  giftCardBrand: z.string().optional().transform((val) => val || null),
  giftCardRegion: z.string().optional().transform((val) => val || null),
  description: z.string().max(500).optional().transform((val) => (val ? sanitizeInput(val) : null)),
  urgency: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
});

export type ServiceRequestInput = z.infer<typeof ServiceRequestInputSchema>;

/** نوع ورودی برای caller‌های کلاینت — backward-compat: null یا undefined هر دو قبول */
export type ServiceRequestClientInput = {
  serviceType: ServiceRequestInput['serviceType'];
  amount: string;
  currency: string;
  urgency?: 'NORMAL' | 'URGENT';
  idempotencyKey?: string | null;
  // اطلاعات تماس — اختیاری، از session گرفته می‌شود
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  contactMethod?: 'telegram' | 'whatsapp';
  // فیلدهای شرطی (هر دو null و undefined قبول)
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
};

export interface ServiceRequestResult {
  success: boolean;
  trackingCode?: string;
  message: string;
  error?: string;
}

// ─── createServiceRequest ─────────────────────────────────────────────────── //
export async function createServiceRequest(input: ServiceRequestClientInput): Promise<ServiceRequestResult> {
  try {
    const headersList = await headers();
    const ip =
      headersList.get('x-real-ip')?.trim() ||
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // 2026-07-07: use shared Redis-backed rate limiter (was in-memory Map, bypassed in Serverless)
    const rateResult = await checkRateLimit(`service-request:${ip}`, 'api');
    if (!rateResult.success) {
      return {
        success: false,
        message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید.',
        error: 'RATE_LIMIT_EXCEEDED',
      };
    }

    // Validate
    const validationResult = ServiceRequestInputSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        message: validationResult.error.errors[0].message,
        error: 'VALIDATION_ERROR',
      };
    }

    const data = validationResult.data;

    // Idempotency — if the client provides a key and we already have it, return the existing record
    if (data.idempotencyKey) {
      const existing = await prisma.serviceRequest.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: { trackingCode: true },
      });
      if (existing) {
        return { success: true, trackingCode: existing.trackingCode, message: 'درخواست قبلاً ثبت شده است.' };
      }
    }

    // Server-side duplicate guard — catches cases where the client didn't
    // send an idempotency key (page reload, back-button resubmit, etc.).
    // A request with the same phone + amount + currency within 5 minutes
    // is considered a duplicate and the existing tracking code is returned.
    {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentDuplicate = await prisma.serviceRequest.findFirst({
        where: {
          phone: data.phone,
          amount: data.amount,
          currency: data.currency,
          createdAt: { gte: fiveMinutesAgo },
        },
        select: { trackingCode: true },
        orderBy: { createdAt: 'desc' },
      });
      if (recentDuplicate) {
        return {
          success: true,
          trackingCode: recentDuplicate.trackingCode,
          message: 'درخواست مشابهی در چند دقیقه اخیر ثبت شده است.',
        };
      }
    }

    const trackingCode = generateTrackingCode();

    // 2026-07-19: اطلاعات کاربر از session (اگر لاگین باشد)
    const session = await auth();
    const userId = session?.user?.id ?? null;

    let resolvedFullName = data.fullName ?? '';
    let resolvedPhone = data.phone ?? '';
    let resolvedEmail = data.email ?? null;
    // contactMethod default: telegram
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

    // اگر کاربر لاگین است ولی شماره موبایل ندارد، درخواست رد می‌شود
    if (userId && !resolvedPhone) {
      return {
        success: false,
        message: 'برای ثبت درخواست باید شماره موبایل خود را در پروفایل تأیید کنید.',
        error: 'PHONE_REQUIRED',
      };
    }

    // اگر کاربر لاگین نیست، fullName و phone از input باید موجود باشند
    if (!userId && (!resolvedFullName || !resolvedPhone)) {
      return {
        success: false,
        message: 'نام و شماره تماس الزامی است.',
        error: 'MISSING_CONTACT',
      };
    }

    // 2026-07-07: gather service-specific fields into metadata JSON
    const metadata: Record<string, string | null> = {
      destinationCountry: data.destinationCountry ?? null,
      bankName: data.bankName ?? null,
      websiteUrl: data.websiteUrl ?? null,
      productName: data.productName ?? null,
      universityName: data.universityName ?? null,
      studentId: data.studentId ?? null,
      platformName: data.platformName ?? null,
      platformUsername: data.platformUsername ?? null,
      softwareName: data.softwareName ?? null,
      subscriptionType: data.subscriptionType ?? null,
      giftCardBrand: data.giftCardBrand ?? null,
      giftCardRegion: data.giftCardRegion ?? null,
    };
    // Drop null entries to keep JSON lean
    const metadataClean = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v !== null),
    ) as Record<string, string>;

    const serviceRequest = await prisma.serviceRequest.create({
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
        metadata: Object.keys(metadataClean).length > 0 ? metadataClean : undefined,
        ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
      },
    });

    // Telegram notification to admin
    const urgencyLabel = data.urgency === 'URGENT' ? '🔴 فوری' : '⚪ عادی';
    const notificationMessage = `*درخواست جدید خدمات*

کد پیگیری: ${trackingCode}
نام: ${data.fullName}
تماس: ${data.phone}
${data.email ? `ایمیل: ${data.email}` : ''}

${serviceTypeLabels[data.serviceType] || data.serviceType}
مبلغ: ${data.amount} ${data.currency}
اولویت: ${urgencyLabel}
روش تماس: ${data.contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'}
${data.description ? `توضیحات: ${data.description}` : ''}

مشاهده در داشبورد: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/service-requests`.trim();

    await sendTelegramNotification(notificationMessage);

    // 2026-07-19: send confirmation email to user (fire-and-forget)
    if (resolvedEmail) {
      await trySendEmail(async () => {
        const provider = await getEmailProviderAsync();
        await provider.send(
          serviceRequestConfirmationEmail({
            to: resolvedEmail as string,
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

    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `New service request: ${trackingCode}`,
        source: 'ServiceRequest',
      },
    });

    return { success: true, trackingCode, message: 'درخواست شما با موفقیت ثبت شد.' };
  } catch {
    return { success: false, message: 'خطایی در ثبت درخواست رخ داد.', error: 'SERVER_ERROR' };
  }
}

// ─── getServiceRequestByTrackingCode (public) ─────────────────────────────── //
// 2026-07-07: now returns adminNotes, updatedAt, estimatedCompletionAt, status log
// Masking: fullName shows first letter + "***", amount is shown but with "~" prefix
export async function getServiceRequestByTrackingCode(trackingCode: string) {
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
        adminNotes: true,
        estimatedCompletionAt: true,
        externalTxId: true,
        createdAt: true,
        updatedAt: true,
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          select: {
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      return { success: false, message: 'درخواستی با این کد پیگیری یافت نشد.' };
    }

    // 2026-07-07: mask sensitive data — only first letter of name is shown
    const maskedName = request.fullName.charAt(0) + '***';

    return {
      success: true,
      data: {
        ...request,
        fullName: maskedName,
      },
    };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// ─── Admin: Get all service requests ────────────────────────────────────────//
export async function getServiceRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPPORT'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params?.status && params.status !== 'ALL') {
    where.status = params.status;
  }
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
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    return {
      success: true,
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// ─── Admin: Update request status ────────────────────────────────────────── //
// 2026-07-07: now writes StatusLog + sends email notification to user
export async function updateServiceRequestStatus(
  id: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  adminNotes?: string,
) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPPORT'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    // Fetch current state — include all notification fields
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

    if (!existing) {
      return { success: false, message: 'درخواست یافت نشد.' };
    }

    const request = await prisma.serviceRequest.update({
      where: { id },
      data: { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
    });

    // Write immutable status log entry
    await prisma.serviceRequestStatusLog.create({
      data: {
        requestId: id,
        fromStatus: existing.status,
        toStatus: status,
        changedBy: session.user.email ?? 'admin',
        note: adminNotes ?? null,
      },
    });

    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Service request ${request.trackingCode} status updated to ${status} by ${session.user.email}`,
        source: 'ServiceRequest',
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const trackingUrl = `${appUrl}/track/${existing.trackingCode}`;

    // ── Push notification: Telegram message to user (fire-and-forget) ──
    // تلگرام مستقیم به شماره کاربر نمی‌شود — از همان bot ادمین استفاده می‌کنیم
    // ولی پیام status change را با اطلاعات کاربر برای ادمین ارسال می‌کنیم
    // تا بتواند سریع با کاربر تماس بگیرد.
    const statusEmoji: Record<string, string> = {
      PENDING:     '⏳',
      IN_PROGRESS: '🔄',
      COMPLETED:   '✅',
      CANCELLED:   '❌',
    };
    const statusFa: Record<string, string> = {
      PENDING:     'در انتظار بررسی',
      IN_PROGRESS: 'در حال انجام',
      COMPLETED:   'تکمیل شده',
      CANCELLED:   'لغو شده',
    };

    const pushMsg = `${statusEmoji[status] ?? '📋'} *تغییر وضعیت درخواست*

کد: \`${existing.trackingCode}\`
مشتری: ${existing.fullName}
تماس: ${existing.phone}
وضعیت جدید: *${statusFa[status] ?? status}*
${adminNotes ? `یادداشت: ${adminNotes}` : ''}
${existing.externalTxId ? `شناسه تراکنش: ${existing.externalTxId}` : ''}

🔗 ${trackingUrl}`.trim();

    // fire-and-forget notification
    void sendTelegramNotification(pushMsg);

    // ── Email notification: status change ──
    if (existing.email) {
      // اگر COMPLETED → رسید دیجیتال بفرست، در غیر این صورت status update ساده
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

    revalidatePath('/dashboard/service-requests');
    return { success: true, message: 'وضعیت با موفقیت به‌روزرسانی شد.' };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// ─── Admin: Delete request ───────────────────────────────────────────────── //
export async function deleteServiceRequest(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'OWNER') {
    return { success: false, message: 'فقط مالک می‌تواند درخواست را حذف کند.' };
  }

  try {
    await prisma.serviceRequest.delete({ where: { id } });
    revalidatePath('/dashboard/service-requests');
    return { success: true, message: 'درخواست حذف شد.' };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// ─── Admin: Get recent activity ──────────────────────────────────────────── //
export async function getServiceRequestRecentActivity(limit = 10) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPPORT'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    const [statusLogs, recent] = await Promise.all([
      prisma.serviceRequestStatusLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          request: {
            select: { trackingCode: true, fullName: true },
          },
        },
      }),
      prisma.serviceRequest.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
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

    for (const r of recent) {
      items.push({
        kind: 'created',
        id: r.id,
        trackingCode: r.trackingCode,
        fullName: r.fullName,
        status: r.status,
        urgency: r.urgency,
        serviceType: r.serviceType,
        createdAt: r.createdAt.toISOString(),
      });
    }

    for (const log of statusLogs) {
      items.push({
        kind: 'status_changed',
        id: `log-${log.id}`,
        trackingCode: log.request.trackingCode,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        updatedBy: log.changedBy,
        createdAt: log.createdAt.toISOString(),
      });
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return { success: true, data: items.slice(0, limit) };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// ─── Admin: Bulk status update ────────────────────────────────────────────── //
export async function bulkUpdateServiceRequestStatus(
  ids: string[],
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPPORT'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  if (ids.length === 0) {
    return { success: false, message: 'هیچ موردی انتخاب نشده است.' };
  }

  try {
    // Fetch current statuses for log
    const existing = await prisma.serviceRequest.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    const result = await prisma.serviceRequest.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    // Write status logs
    await prisma.serviceRequestStatusLog.createMany({
      data: existing.map((r) => ({
        id: randomBytes(8).toString('hex'),
        requestId: r.id,
        fromStatus: r.status,
        toStatus: status,
        changedBy: session.user?.email ?? 'admin',
      })),
    });

    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Bulk update: ${result.count} requests set to ${status} by ${session.user.email}`,
        source: 'ServiceRequest',
      },
    });

    revalidatePath('/dashboard/service-requests');
    return {
      success: true,
      message: `${result.count.toLocaleString('fa-IR')} مورد به‌روزرسانی شد.`,
      count: result.count,
    };
  } catch {
    return { success: false, message: 'خطا در به‌روزرسانی گروهی رخ داد.' };
  }
}

// ─── Admin: Export CSV ───────────────────────────────────────────────────── //
export async function exportServiceRequestsCsv(params?: {
  status?: string;
  search?: string;
}) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPPORT'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  const where: Record<string, unknown> = {};
  if (params?.status && params.status !== 'ALL') {
    where.status = params.status;
  }
  if (params?.search) {
    where.OR = [
      { trackingCode: { contains: params.search, mode: 'insensitive' } },
      { fullName: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  try {
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

    const escape = (val: unknown): string => {
      const s = val === null || val === undefined ? '' : String(val);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csvRows: string[] = [header.join(',')];
    for (const r of rows) {
      csvRows.push(
        [
          escape(r.trackingCode),
          escape(r.fullName),
          escape(r.phone),
          escape(r.email),
          escape(serviceLabel[r.serviceType] ?? r.serviceType),
          escape(r.amount),
          escape(r.currency),
          escape(r.urgency === 'URGENT' ? 'فوری' : 'عادی'),
          escape(r.contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'),
          escape(statusLabel[r.status] ?? r.status),
          escape(r.createdAt.toISOString()),
        ].join(','),
      );
    }

    return { success: true, data: '\uFEFF' + csvRows.join('\n') };
  } catch {
    return { success: false, message: 'خطا در ساخت فایل خروجی.' };
  }
}

// ─── Admin: Get stats ─────────────────────────────────────────────────────── //
export async function getServiceRequestStats() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPPORT'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    const [byStatus, todayCount, urgentCount, pendingUrgentCount] = await Promise.all([
      prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.serviceRequest.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.serviceRequest.count({ where: { urgency: 'URGENT' } }),
      prisma.serviceRequest.count({
        where: { urgency: 'URGENT', status: 'PENDING' },
      }),
    ]);

    const counts: Record<string, number> = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
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
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// ─── User: Get own service requests ──────────────────────────────────────── //
// 2026-07-07: allows logged-in users to see their own orders in /dashboard/my-requests
export async function getMyServiceRequests(params?: { page?: number; limit?: number }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'لطفاً وارد حساب کاربری خود شوید.' };
  }

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const skip = (page - 1) * limit;

  try {
    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: { userId: session.user.id },
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
      prisma.serviceRequest.count({ where: { userId: session.user.id } }),
    ]);

    return {
      success: true,
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// ─── User: Cancel own PENDING request ────────────────────────────────────── //
// فقط سفارش‌های PENDING در بازه ۳۰ دقیقه اول قابل لغو هستند.
export async function cancelMyServiceRequest(trackingCode: string): Promise<{
  success: boolean;
  message: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: 'لطفاً وارد حساب کاربری خود شوید.' };
  }

  try {
    const req = await prisma.serviceRequest.findUnique({
      where: { trackingCode },
      select: { id: true, status: true, userId: true, createdAt: true, trackingCode: true },
    });

    if (!req) {
      return { success: false, message: 'سفارشی با این کد یافت نشد.' };
    }

    if (req.userId !== session.user.id) {
      return { success: false, message: 'این سفارش به حساب شما تعلق ندارد.' };
    }

    if (req.status !== 'PENDING') {
      return { success: false, message: 'فقط سفارش‌های «در انتظار بررسی» قابل لغو هستند.' };
    }

    // پنجره لغو: ۳۰ دقیقه از زمان ثبت
    const thirtyMinutes = 30 * 60 * 1000;
    const elapsed = Date.now() - new Date(req.createdAt).getTime();
    if (elapsed > thirtyMinutes) {
      return {
        success: false,
        message: 'مهلت لغو خودکار (۳۰ دقیقه) پایان یافته. برای لغو با پشتیبانی تماس بگیرید.',
      };
    }

    await prisma.$transaction([
      prisma.serviceRequest.update({
        where: { id: req.id },
        data: { status: 'CANCELLED' },
      }),
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

    revalidatePath('/dashboard/my-requests');
    return { success: true, message: 'سفارش با موفقیت لغو شد.' };
  } catch {
    return { success: false, message: 'خطایی در لغو سفارش رخ داد.' };
  }
}

// ─── User: Claim a guest request by tracking code ────────────────────────── //
// کاربر وارد‌شده می‌تواند سفارش مهمان خود را با کد پیگیری + OTP تأیید به حسابش وصل کند.
// مرحله ۱: درخواست ادغام (بررسی ownership با ایمیل)
// مرحله ۲: OTP ارسال‌شده در progressive-capture.ts تأیید می‌شود (همان issueServiceOtp)
export async function claimGuestRequest(trackingCode: string): Promise<{
  success: boolean;
  message: string;
  requiresOtp?: boolean;
  email?: string;
}> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { success: false, message: 'لطفاً وارد حساب کاربری خود شوید.' };
  }

  try {
    const req = await prisma.serviceRequest.findUnique({
      where: { trackingCode: trackingCode.trim().toUpperCase() },
      select: { id: true, userId: true, email: true, emailVerified: true },
    });

    if (!req) {
      return { success: false, message: 'سفارشی با این کد یافت نشد.' };
    }

    if (req.userId) {
      if (req.userId === session.user.id) {
        return { success: false, message: 'این سفارش قبلاً به حساب شما وصل شده است.' };
      }
      return { success: false, message: 'این سفارش به حساب دیگری تعلق دارد.' };
    }

    // بررسی: ایمیل سفارش باید با ایمیل کاربر match کند
    const reqEmail = req.email?.trim().toLowerCase();
    const userEmail = session.user.email.trim().toLowerCase();

    if (!reqEmail) {
      // سفارش ایمیل ندارد — مستقیم لینک می‌کنیم (کاربر login کرده = اعتبارسنجی کافی)
      await prisma.serviceRequest.update({
        where: { id: req.id },
        data: { userId: session.user.id },
      });
      revalidatePath('/dashboard/my-requests');
      return { success: true, message: 'سفارش با موفقیت به حساب شما اضافه شد.' };
    }

    if (reqEmail !== userEmail) {
      return {
        success: false,
        message: 'ایمیل این سفارش با ایمیل حساب شما مطابقت ندارد.',
      };
    }

    // ایمیل match می‌کند — اگر قبلاً verify شده بود، مستقیم لینک کن
    if (req.emailVerified) {
      await prisma.serviceRequest.update({
        where: { id: req.id },
        data: { userId: session.user.id },
      });
      revalidatePath('/dashboard/my-requests');
      return { success: true, message: 'سفارش با موفقیت به حساب شما اضافه شد.' };
    }

    // هنوز verify نشده — OTP نیاز داریم
    return {
      success: true,
      requiresOtp: true,
      email: reqEmail,
      message: 'برای تأیید مالکیت، یک کد به ایمیل شما ارسال می‌شود.',
    };
  } catch {
    return { success: false, message: 'خطایی رخ داد. دوباره تلاش کنید.' };
  }
}



// ─── Support links (cached) ───────────────────────────────────────────────── //
const _getCachedSupportLinks = unstable_cache(
  async () => {
    const links = await prisma.socialLink.findMany({
      where: { isActive: true, type: 'SUPPORT' },
    });
    const telegram =
      links.find((l) => ['telegram', 'تلگرام'].includes(l.name.toLowerCase()))?.url ?? null;
    const whatsapp =
      links.find((l) => ['whatsapp', 'واتساپ'].includes(l.name.toLowerCase()))?.url ?? null;
    return { telegram, whatsapp };
  },
  ['support-contact-links', 'v1'],
  { revalidate: 600, tags: ['sidebar-data'] },
);

export async function getSupportContactLinks() {
  try {
    return await _getCachedSupportLinks();
  } catch {
    return { telegram: null, whatsapp: null };
  }
}
