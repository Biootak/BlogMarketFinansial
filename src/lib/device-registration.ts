import { createHash } from 'node:crypto';
import prisma from '@/lib/db';
import { serverLog } from '@/lib/server-logger';

/**
 * device-registration — ثبت/به‌روزرسانی دستگاه در ورود
 *
 * باگ گزارش‌شده (2026-08-22): صفحهٔ دستگاه‌های داشبورد همیشه خالی بود —
 * مدل Device وجود داشت ولی هیچ مسیری هرگز `device.create` نمی‌زد (فقط
 * read/update در deviceActions). این ماژول نقطهٔ واحد ثبت است و از
 * authorize() در src/auth.ts صدا زده می‌شود (مسیر password و after_otp).
 *
 * fingerprint سمت سرور = SHA-256(userAgent | accept-language) — ایده‌آل
 * fingerprint واقعی کلاینت‌ساید است (FingerprintJS و…) اما همین heuristic
 * بدون کد کلاینت، دستگاه را پایدار شناسایی می‌کند؛ IP عمداً داخل hash نیست
 * چون در شبکهٔ موبایل/CGNAT افغانستان هر روز عوض می‌شود و دستگاه تکراری
 * می‌ساخت.
 *
 * سیاست وضعیت: اولین دستگاه فعال کاربر TRUSTED می‌شود (خودِ دستگاهِ ثبت‌کننده)،
 * بقیه UNVERIFIED تا کاربر از داشبورد تأییدشان کند. خطای این ماژول هرگز
 * نباید ورود را بلاک کند — همه‌چیز best-effort است.
 */

export function deriveDeviceFingerprint(
  userAgent: string | null | undefined,
  acceptLanguage: string | null | undefined,
): string {
  return createHash('sha256')
    .update(`${userAgent ?? 'unknown'}|${acceptLanguage ?? 'unknown'}`)
    .digest('hex')
    .slice(0, 32);
}

export async function upsertLoginDevice(params: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  acceptLanguage?: string | null;
}): Promise<void> {
  const { userId, ip, userAgent, acceptLanguage } = params;
  try {
    const { v4: createId } = await import('uuid');
    const now = new Date();
    const fingerprint = deriveDeviceFingerprint(userAgent, acceptLanguage);

    const existing = await prisma.device.findFirst({
      where: { userId, fingerprint },
      select: { id: true },
    });

    if (existing) {
      await prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: now, ...(ip ? { ip } : {}), ...(userAgent ? { userAgent } : {}) },
      });
      await prisma.auditLog.create({
        data: {
          id: createId(),
          actorId: userId,
          actorRole: 'USER',
          action: 'USER_SIGNIN',
          entityType: 'Device',
          entityId: existing.id,
          ip: ip ?? null,
        },
      });
      return;
    }

    // دستگاه جدید — اولین دستگاهِ غیر-revoked کاربر خودکار Trusted می‌شود
    const activeCount = await prisma.device.count({
      where: { userId, status: { not: 'REVOKED' } },
    });
    const device = await prisma.device.create({
      data: {
        id: createId(),
        userId,
        fingerprint,
        userAgent: userAgent ?? null,
        ip: ip ?? null,
        status: activeCount === 0 ? 'TRUSTED' : 'UNVERIFIED',
        lastSeenAt: now,
      },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        id: createId(),
        actorId: userId,
        actorRole: 'USER',
        action: 'USER_SIGNIN',
        entityType: 'Device',
        entityId: device.id,
        ip: ip ?? null,
      },
    });
  } catch (error) {
    // ثبت دستگاه هرگز نباید ورود را بشکند
    serverLog.warn('device-registration', 'upsert-failed', error);
  }
}
