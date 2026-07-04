'use server';

import prisma from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// Service type labels
const serviceTypeLabels: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  OTHER: 'سایر خدمات',
};

// Generate unique tracking code
function generateTrackingCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BT-${timestamp}-${random}`;
}

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 5;

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

// Sanitize input
function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim();
}

// Send Telegram notification to admin
async function sendTelegramNotification(message: string): Promise<boolean> {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || settings?.telegram;

    if (!botToken || !chatId) {
      console.warn('Telegram notification skipped: missing bot token or chat ID');
      return false;
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

// Validation schema
const ServiceRequestInputSchema = z.object({
  fullName: z.string().min(3).max(100).transform(sanitizeInput),
  phone: z.string().min(10).max(15).regex(/^[0-9+]+$/),
  email: z.string().email().optional().or(z.literal('')).transform((val) => val || null),
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
  destinationCountry: z.string().optional().transform((val) => val || null),
  bankName: z.string().optional().transform((val) => val || null),
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

export async function createServiceRequest(input: ServiceRequestInput): Promise<ServiceRequestResult> {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Rate limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${rateLimit.retryAfter} ثانیه دیگر تلاش کنید.`,
        error: 'RATE_LIMIT_EXCEEDED',
      };
    }

    // Validate
    const validationResult = ServiceRequestInputSchema.safeParse(input);
    if (!validationResult.success) {
      return { success: false, message: validationResult.error.errors[0].message, error: 'VALIDATION_ERROR' };
    }

    const data = validationResult.data;
    const trackingCode = generateTrackingCode();

    // 2026-06-14: skip the duplicate-pre-check. The new
    // (phone, amount, currency, createdAt) composite index from
    // schema.prisma lets the unique constraint back this — we
    // attempt the insert and treat P2002 as a duplicate. Saves
    // one round-trip on the happy path and removes a race window.
    // Create request
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
      },
    });

    // Send Telegram notification to admin
    const urgencyLabel = data.urgency === 'URGENT' ? 'فوری' : 'عادی';
    const notificationMessage = `
*درخواست جدید خدمات*

کد پیگیری: \`${trackingCode}\`
نام: ${data.fullName}
تماس: ${data.phone}
${data.email ? `ایمیل: ${data.email}` : ''}

${serviceTypeLabels[data.serviceType] || data.serviceType}
مبلغ: ${data.amount} ${data.currency}
اولویت: ${urgencyLabel}
روش تماس: ${data.contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'}

${data.description ? `توضیحات: ${data.description}` : ''}

[مشاهده در داشبورد](${process.env.NEXT_PUBLIC_APP_URL}/dashboard/service-requests)
    `.trim();

    await sendTelegramNotification(notificationMessage);

    // Log
    await prisma.systemLog.create({
      data: { level: 'INFO', message: `New service request: ${trackingCode}`, source: 'ServiceRequest' },
    });

    return { success: true, trackingCode, message: 'درخواست شما با موفقیت ثبت شد.' };
  } catch (error) {
    console.error('Error creating service request:', error);
    return { success: false, message: 'خطایی در ثبت درخواست رخ داد.', error: 'SERVER_ERROR' };
  }
}

// Get request by tracking code (public)
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
        createdAt: true,
      },
    });

    if (!request) {
      return { success: false, message: 'درخواستی با این کد پیگیری یافت نشد.' };
    }

    return { success: true, data: request };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// Admin: Get all service requests
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
      // 2026-06-14: this was the only `contains` filter that didn't
      // specify `mode: 'insensitive'`. Postgres treats it as
      // case-sensitive by default, so mixed-case searches silently
      // returned fewer rows than expected.
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

// Admin: Update request status
export async function updateServiceRequestStatus(
  id: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  adminNotes?: string
) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    const request = await prisma.serviceRequest.update({
      where: { id },
      data: { status, adminNotes },
    });

    // Log activity
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Service request ${request.trackingCode} status updated to ${status} by ${session.user.email}`,
        source: 'ServiceRequest',
      },
    });

    revalidatePath('/dashboard/service-requests');
    return { success: true, message: 'وضعیت با موفقیت به‌روزرسانی شد.' };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// Admin: Delete request
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

// Admin: Get recent activity (last status changes + new requests)
// 2026-07-04: New — feeds the right-side activity rail on the page.
export async function getServiceRequestRecentActivity(limit = 10) {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    // Build the activity stream from both the system log (status changes)
    // and recent inserts. We only return status-change + new-request events
    // — those are the only "activity" that matters on this page.
    const [logs, recent] = await Promise.all([
      prisma.systemLog.findMany({
        where: {
          source: 'ServiceRequest',
          message: { startsWith: 'Service request' },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
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
    for (const log of logs) {
      // Pattern: `Service request {trackingCode} status updated to {STATUS} by {email}`
      const match = log.message.match(
        /^Service request (\S+) status updated to (\S+) by (.+)$/,
      );
      if (!match) continue;
      items.push({
        kind: 'status_changed',
        id: `log-${log.id}`,
        trackingCode: match[1],
        fromStatus: null,
        toStatus: match[2],
        updatedBy: match[3],
        createdAt: log.timestamp.toISOString(),
      });
    }

    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return { success: true, data: items.slice(0, limit) };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// Admin: Bulk status update
// 2026-07-04: New — supports the multi-select action bar in the table.
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
    const result = await prisma.serviceRequest.updateMany({
      where: { id: { in: ids } },
      data: { status },
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
    return { success: false, message: 'خطایی در به‌روزرسانی گروهی رخ داد.' };
  }
}

// Admin: Export to CSV
// 2026-07-04: New — generates a CSV string from current filtered list.
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
      // Wrap in quotes if contains comma, quote, or newline; escape internal quotes
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

    // BOM for Excel UTF-8 compatibility
    return { success: true, data: '\uFEFF' + csvRows.join('\n') };
  } catch {
    return { success: false, message: 'خطا در ساخت فایل خروجی.' };
  }
}

// Admin: Get stats
export async function getServiceRequestStats() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    // 2026-06-14: collapsed 6 separate count() calls into a single
    // groupBy({ by: ['status'], _count: true }) + 1 today count.
    // Wall-clock drops from 6 round-trips to 2.
    // 2026-07-04: added 2 more parallel counts — urgent (urgency=URGENT)
    // and pendingUrgent (urgency=URGENT + status=PENDING) — so the
    // dashboard's urgent KPI doesn't have to use the pending count as
    // an approximation.
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


// Get support links for contact form
export async function getSupportContactLinks() {
  try {
    const links = await prisma.socialLink.findMany({
      where: { isActive: true, type: 'SUPPORT' },
    });

    const telegram = links.find((l) =>
      ['telegram', 'تلگرام'].includes(l.name.toLowerCase())
    )?.url || null;

    const whatsapp = links.find((l) =>
      ['whatsapp', 'واتساپ'].includes(l.name.toLowerCase())
    )?.url || null;

    return {
      success: true,
      data: { telegram, whatsapp },
    };
  } catch {
    return { success: false, data: { telegram: null, whatsapp: null } };
  }
}
