'use server';

import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { API_SCOPES, type ApiScope } from '@/lib/developer-portal-constants';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import { headers } from 'next/headers';
import { z } from 'zod';

/** نتیجهٔ uniform برای همهٔ server actions — برای type-safety در client. */
export type ApiKeyActionResult =
  | { success: true; data?: unknown }
  | { success: false; error: string };

// ─── Constants ──────────────────────────────────────────────────────────── //

/** محدودیت‌های rate limit — هر کاربر در یک ساعت. */
const RATE_LIMITS: Record<string, number> = {
  create_api_key: 10,
  create_webhook: 20,
};

const ONE_HOUR_MS = 60 * 60 * 1000;

// ─── Validation schemas ─────────────────────────────────────────────────── //

const CreateApiKeySchema = z.object({
  name: z.string().min(3, 'نام کلید باید حداقل ۳ کاراکتر باشد').max(50),
  scopes: z.array(z.string()).max(API_SCOPES.length).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const WebhookUrlSchema = z.object({
  url: z
    .string()
    .min(8, 'آدرس وب‌هوک نامعتبر است')
    .max(2048)
    .refine((s) => {
      try {
        const u = new URL(s);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    }, 'آدرس باید یک URL معتبر با http یا https باشد'),
  events: z.array(z.string()).min(1, 'حداقل یک رویداد انتخاب کنید').max(20),
});

// ─── Helpers ────────────────────────────────────────────────────────────── //

function secureRandomString(length: number): string {
  return randomBytes(length).toString('base64url').slice(0, length);
}

async function getRequestContext() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}

/**
 * Rate limit ساده: شمارش تعداد action در پنجرهٔ ۱ ساعته.
 * اگر از سقف عبور کند، خطا برمی‌گرداند.
 */
async function checkRateLimit(
  userId: string,
  action: string,
): Promise<{ ok: true } | { ok: false; error: string; retryInSec: number }> {
  const limit = RATE_LIMITS[action];
  if (!limit) return { ok: true };

  const windowStart = new Date(Date.now() - ONE_HOUR_MS);

  const recent = await prisma.apiRateLimit.findFirst({
    where: { userId, action, windowStart: { gte: windowStart } },
    orderBy: { windowStart: 'desc' },
  });

  if (recent && recent.count >= limit) {
    const retryInSec = Math.ceil((recent.windowStart.getTime() + ONE_HOUR_MS - Date.now()) / 1000);
    return {
      ok: false,
      error: `سقف ${limit} ${action === 'create_api_key' ? 'کلید' : 'وب‌هوک'} در ساعت رسیده. ${Math.ceil(retryInSec / 60)} دقیقهٔ دیگر تلاش کنید.`,
      retryInSec,
    };
  }

  // increment یا ساختن رکورد جدید
  if (recent) {
    await prisma.apiRateLimit.update({
      where: { id: recent.id },
      data: { count: recent.count + 1 },
    });
  } else {
    await prisma.apiRateLimit.create({
      data: { userId, action, windowStart: new Date() },
    });
  }

  return { ok: true };
}

async function audit(params: {
  userId: string;
  apiKeyId: string;
  action: 'CREATE' | 'VIEW' | 'DELETE' | 'TOGGLE';
  metadata?: Record<string, unknown>;
}) {
  const ctx = await getRequestContext();
  await prisma.apiKeyAudit.create({
    data: {
      userId: params.userId,
      apiKeyId: params.apiKeyId,
      action: params.action,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: params.metadata as object | undefined,
    },
  });
}

// ─── API Keys ───────────────────────────────────────────────────────────── //

export async function getMyApiKeys() {
  const auth = await requireUser();
  if (!auth.success) return [];
  return prisma.apiKey.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      key: true,
      secret: true,
      isActive: true,
      lastUsed: true,
      lastIp: true,
      expiresAt: true,
      scopes: true,
      createdAt: true,
    },
  });
}

export async function createApiKey(raw: unknown): Promise<ApiKeyActionResult> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  const parsed = CreateApiKeySchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  // Rate limit
  const rl = await checkRateLimit(auth.user.id, 'create_api_key');
  if (!rl.ok) return { success: false, error: rl.error };

  // اعتبارسنجی scopes
  const validScopes = new Set(API_SCOPES.map((s) => s.value));
  const scopes = (parsed.data.scopes ?? []).filter((s) => validScopes.has(s as ApiScope));

  // تولید کلید و سکرت امن
  const key = `pk_${secureRandomString(32)}`;
  const secret = `sk_${secureRandomString(48)}`;

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const created = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      key,
      secret,
      userId: auth.user.id,
      scopes,
      expiresAt,
    },
  });

  await audit({
    userId: auth.user.id,
    apiKeyId: created.id,
    action: 'CREATE',
    metadata: { name: created.name, scopes },
  });

  revalidateTag('api-keys');

  return {
    success: true,
    data: {
      id: created.id,
      name: created.name,
      key: created.key,
      secret: created.secret,
      scopes: created.scopes,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

export async function deleteApiKey(id: string): Promise<ApiKeyActionResult> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  // audit قبل از delete (چون cascade می‌شود)
  await audit({
    userId: auth.user.id,
    apiKeyId: id,
    action: 'DELETE',
  });

  await prisma.apiKey.delete({
    where: { id, userId: auth.user.id },
  });

  revalidateTag('api-keys');
  return { success: true };
}

export async function toggleApiKey(id: string): Promise<ApiKeyActionResult> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  const k = await prisma.apiKey.findUnique({ where: { id, userId: auth.user.id } });
  if (!k) return { success: false, error: 'کلید یافت نشد' };

  await prisma.apiKey.update({ where: { id }, data: { isActive: !k.isActive } });
  await audit({ userId: auth.user.id, apiKeyId: id, action: 'TOGGLE' });

  revalidateTag('api-keys');
  return { success: true };
}

// ─── Audit log query ────────────────────────────────────────────────────── //

export async function getMyApiKeyAudits(limit = 20) {
  const auth = await requireUser();
  if (!auth.success) return [];
  return prisma.apiKeyAudit.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { ApiKey: { select: { name: true } } },
  });
}

// ─── Webhooks ───────────────────────────────────────────────────────────── //

export async function getMyWebhooks() {
  const auth = await requireUser();
  if (!auth.success) return [];
  return prisma.webhook.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWebhook(raw: unknown): Promise<ApiKeyActionResult> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  const parsed = WebhookUrlSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0]?.message ?? 'خطای اعتبارسنجی' };

  const rl = await checkRateLimit(auth.user.id, 'create_webhook');
  if (!rl.ok) return { success: false, error: rl.error };

  const secret = `whsec_${secureRandomString(40)}`;

  await prisma.webhook.create({
    data: {
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
      userId: auth.user.id,
    },
  });

  revalidateTag('webhooks');
  return { success: true };
}

export async function deleteWebhook(id: string): Promise<ApiKeyActionResult> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  await prisma.webhook.delete({
    where: { id, userId: auth.user.id },
  });

  revalidateTag('webhooks');
  return { success: true };
}

export async function toggleWebhook(id: string): Promise<ApiKeyActionResult> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  const wh = await prisma.webhook.findUnique({ where: { id, userId: auth.user.id } });
  if (!wh) return { success: false, error: 'وب‌هوک یافت نشد' };

  await prisma.webhook.update({
    where: { id },
    data: { isActive: !wh.isActive },
  });

  revalidateTag('webhooks');
  return { success: true };
}

/** تلاش مجدد برای ارسال یک delivery ناموفق. */
export async function replayWebhookDelivery(deliveryId: string): Promise<ApiKeyActionResult> {
  const auth = await requireUser();
  if (!auth.success) return { success: false, error: 'احراز هویت نشد' };

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { Webhook: true },
  });

  if (!delivery || delivery.Webhook.userId !== auth.user.id) {
    return { success: false, error: 'رکورد یافت نشد' };
  }

  // mark as retrying
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { status: 'RETRYING', attempt: delivery.attempt + 1 },
  });

  // در production: dispatch به صف (BullMQ/Inngest). اینجا فقط log می‌کنیم.
  // پیاده‌سازی واقعی ارسال در jobs/dispatchWebhook.ts خواهد بود.
  revalidateTag('webhook-deliveries');
  return { success: true };
}

// ─── Recent API Activity (برای داشبورد مشتری) ──────────────────────────── //

export async function getRecentApiActivity(limit = 10) {
  const auth = await requireUser();
  if (!auth.success) return [];
  return prisma.apiCallLog.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
