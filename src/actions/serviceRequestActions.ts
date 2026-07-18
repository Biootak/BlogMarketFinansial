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
} from '@/lib/email/templates';
import { isPhoneValid, normalizeToE164 } from '@/lib/phone-validation';

// ─── Service type labels ──────────────────────────────────────────────────── //
const serviceTypeLabels: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
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
  fullName: z.string().min(3).max(100).transform(sanitizeInput),
  // 2026-07-10: libphonenumber-js — normalize to E.164 for storage
  phone: z
    .string()
    .min(1)
    .refine((val) => isPhoneValid(val), { message: 'شماره تماس معتبر نیست' })
    .transform((val) => normalizeToE164(val)),
  email: z.string().email().optional().or(z.literal('')).transform((val) => val || null),
  // 2026-07-10: client-generated UUIDv4 for idempotency (prevents duplicate on retry)
  idempotencyKey: z.string().uuid().optional().nullable(),
  serviceType: z.enum([
    'INTERNATIONAL_TRANSFER',
    'ONLINE_PAYMENT',
    'TUITION_PAYMENT',
    'FREELANCE_INCOME',
    'SOFTWARE_PURCHASE',
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
  description: z.string().max(500).optional().transform((val) => (val ? sanitizeInput(val) : null)),
  urgency: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
  contactMethod: z.enum(['telegram', 'whatsapp']),
});

export type ServiceRequestInput = z.infer<typeof ServiceRequestInputSchema>;

export interface ServiceRequestResult {
  success: boolean;
  trackingCode?: string;
  message: string;
  error?: string;
}

// ─── createServiceRequest ─────────────────────────────────────────────────── //
export async function createServiceRequest(input: ServiceRequestInput): Promise<ServiceRequestResult> {
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

    // 2026-07-10: Idempotency — if the client provides a key and we already have it, return the existing record
    if (data.idempotencyKey) {
      const existing = await prisma.serviceRequest.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: { trackingCode: true },
      });
      if (existing) {
        return { success: true, trackingCode: existing.trackingCode, message: 'درخواست قبلاً ثبت شده است.' };
      }
    }

    const trackingCode = generateTrackingCode();

    // 2026-07-07: collect userId if a session exists (optional — guest orders allowed)
    const session = await auth();
    const userId = session?.user?.id ?? null;

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
    };
    // Drop null entries to keep JSON lean
    const metadataClean = Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v !== null),
    ) as Record<string, string>;

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        trackingCode,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        serviceType: data.serviceType,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        urgency: data.urgency,
        contactMethod: data.contactMethod,
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

    // 2026-07-07: send confirmation email to user (fire-and-forget)
    if (data.email) {
      await trySendEmail(async () => {
        const provider = await getEmailProviderAsync();
        await provider.send(
          serviceRequestConfirmationEmail({
            to: data.email as string,
            fullName: data.fullName,
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
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
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
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    // Fetch current state first for the status log
    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
      select: { status: true, trackingCode: true, fullName: true, email: true },
    });

    if (!existing) {
      return { success: false, message: 'درخواست یافت نشد.' };
    }

    const request = await prisma.serviceRequest.update({
      where: { id },
      data: { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
    });

    // 2026-07-07: write immutable status log entry
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

    // 2026-07-07: notify user by email (fire-and-forget)
    if (existing.email) {
      await trySendEmail(async () => {
        const provider = await getEmailProviderAsync();
        await provider.send(
          serviceRequestStatusEmail({
            to: existing.email as string,
            fullName: existing.fullName,
            trackingCode: existing.trackingCode,
            newStatus: status,
            adminNote: adminNotes,
            appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
          }),
        );
      });
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
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
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
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
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
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
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
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
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
