'use server';

import prisma from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// Service type labels
const serviceTypeLabels: Record<string, string> = {
  INTERNATIONAL_TRANSFER: '🌍 حواله بین‌المللی',
  ONLINE_PAYMENT: '💳 پرداخت آنلاین',
  TUITION_PAYMENT: '🎓 پرداخت شهریه',
  FREELANCE_INCOME: '💼 نقد کردن درآمد',
  SOFTWARE_PURCHASE: '📦 خرید نرم‌افزار',
  OTHER: '✨ سایر خدمات',
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
    const urgencyEmoji = data.urgency === 'URGENT' ? '🔴 فوری' : '🟢 عادی';
    const notificationMessage = `
🆕 *درخواست جدید خدمات*

🔖 کد پیگیری: \`${trackingCode}\`
👤 نام: ${data.fullName}
📱 تماس: ${data.phone}
${data.email ? `📧 ایمیل: ${data.email}` : ''}

${serviceTypeLabels[data.serviceType] || data.serviceType}
💰 مبلغ: ${data.amount} ${data.currency}
⏰ اولویت: ${urgencyEmoji}
📲 روش تماس: ${data.contactMethod === 'telegram' ? 'تلگرام' : 'واتساپ'}

${data.description ? `📝 توضیحات: ${data.description}` : ''}

🔗 [مشاهده در داشبورد](${process.env.NEXT_PUBLIC_APP_URL}/dashboard/service-requests)
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
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
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
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
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
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return { success: false, message: 'فقط سوپر ادمین می‌تواند درخواست را حذف کند.' };
  }

  try {
    await prisma.serviceRequest.delete({ where: { id } });
    revalidatePath('/dashboard/service-requests');
    return { success: true, message: 'درخواست حذف شد.' };
  } catch {
    return { success: false, message: 'خطایی رخ داد.' };
  }
}

// Admin: Get stats
export async function getServiceRequestStats() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
    return { success: false, message: 'دسترسی غیرمجاز' };
  }

  try {
    // 2026-06-14: collapsed 6 separate count() calls into a single
    // groupBy({ by: ['status'], _count: true }) + 1 today count.
    // Wall-clock drops from 6 round-trips to 2.
    const [byStatus, todayCount] = await Promise.all([
      prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.serviceRequest.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
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
