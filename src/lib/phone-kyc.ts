/**
 * phone-kyc.ts — تأیید خودکار شماره موبایل از طریق تلگرام (بدون OTP)
 * ----------------------------------------------------------------------------
 * جریان auto-verify:
 *   1. کاربر در سایت شماره را وارد می‌کند → User.pendingPhone ذخیره می‌شود
 *   2. ربات تلگرام دکمهٔ «ارسال شماره تماس» (request_contact) را می‌فرستد
 *   3. کاربر دکمه را می‌زند → وبهوک message.contact دریافت می‌کند
 *   4. این ماژول شمارهٔ تلگرام (که خود تلگرام تأییدش کرده) را با pendingPhone
 *      مقایسه می‌کند — فقط اگر یکی باشند رکورد LEVEL_1 APPROVED ساخته می‌شود.
 *
 * امنیت: شمارهٔ contact از سمت تلگرام می‌آید و تلگرام خودش شماره‌ها را
 * تأیید می‌کند (حساب‌های VoIP/مجازی را برای شمارهٔ تماس قبول نمی‌کند).
 */

import prisma from '@/lib/db';
import { validatePhone } from '@/lib/phone-validation';

export type AutoVerifyPhoneResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'no-pending'
        | 'mismatch'
        | 'no-customer'
        | 'already-verified'
        | 'account-blocked'
        | 'telegram-identity-mismatch'
        | 'db-error';
    };

const KYC_EXPIRY_MONTHS = 24;

/**
 * مقایسهٔ خودکار شمارهٔ تلگرام با شمارهٔ در انتظار کاربر و تأیید LEVEL_1.
 * فقط وقتی همهٔ این شرط‌ها برقرار باشند تأیید انجام می‌شود:
 *   ۱. شمارهٔ تلگرام (که خود تلگرام تأییدش کرده) با pendingPhone یکی باشد (E.164)
 *   ۲. همان حساب تلگرام (telegramUserId از /start) شماره را فرستاده باشد
 *      (contact.user_id باید برابر telegramUserId باشد)
 *   ۳. مشتری در وضعیت مسدود (FROZEN/CLOSED) نباشد
 */
export type AutoVerifyPreloadedUser = {
  id: string;
  pendingPhone: string | null;
  telegramUserId: string | null;
  Customer: { id: string; exchangeId: string; kycLevel: string; status: string } | null;
};

export async function autoVerifyPhoneFromTelegram(
  userId: string,
  rawPhone: string,
  opts?: {
    tgUserId?: string | null;
    /** وبهوک کاربر را با chatId خوانده — همین‌جا استفاده کن تا کوئری دوم حذف شود */
    preloadedUser?: AutoVerifyPreloadedUser;
  },
): Promise<AutoVerifyPhoneResult> {
  try {
    // سرعت: اگر وبهوک کاربر را از قبل با chatId خوانده، دیگر findUnique نمی‌زنیم
    const user =
      opts?.preloadedUser ??
      (await prisma.user.findUnique({
        where: { id: userId },
        select: {
          pendingPhone: true,
          telegramUserId: true,
          Customer: {
            select: { id: true, exchangeId: true, kycLevel: true, status: true },
          },
        },
      }));
    if (!user) return { ok: false, reason: 'db-error' };
    if (!user.pendingPhone) return { ok: false, reason: 'no-pending' };

    // همان حساب تلگرام که /start زده باید شماره را بفرستد — ضد replay/فیشینگ
    if (user.telegramUserId && opts?.tgUserId && user.telegramUserId !== opts.tgUserId) {
      return { ok: false, reason: 'telegram-identity-mismatch' };
    }

    // نرمال‌سازی شمارهٔ تلگرام — معمولاً بدون + می‌آید (989916520952) و چون
    // شمارهٔ تلگرام همیشه بین‌المللی کامل است، + اضافه می‌کنیم تا با
    // کشور پیش‌فرض (افغانستان) اشتباه پارس نشود.
    const tgDigits = rawPhone.replace(/\D/g, '');
    const tgWithPlus = tgDigits ? `+${tgDigits}` : rawPhone.trim();
    const norm = validatePhone(tgWithPlus);
    if (!norm.valid) return { ok: false, reason: 'mismatch' };
    if (norm.e164 !== user.pendingPhone) return { ok: false, reason: 'mismatch' };

    const customer = user.Customer;
    if (!customer) return { ok: false, reason: 'no-customer' };
    if (customer.status === 'FROZEN' || customer.status === 'CLOSED') {
      return { ok: false, reason: 'account-blocked' };
    }
    if (customer.kycLevel !== 'NONE') return { ok: false, reason: 'already-verified' };

    const { v4: createId } = await import('uuid');
    const now = new Date();
    const expiresAt = new Date(
      now.getFullYear(),
      now.getMonth() + KYC_EXPIRY_MONTHS,
      now.getDate(),
    );

    await prisma.$transaction(async (tx) => {
      await tx.kycVerification.create({
        data: {
          id: createId(),
          exchangeId: customer.exchangeId,
          customerId: customer.id,
          level: 'LEVEL_1',
          status: 'APPROVED',
          docType: 'PHONE',
          docNumber: norm.e164,
          reviewedAt: now,
          expiresAt,
          updatedAt: now,
        },
      });

      // اگر مدارک سطح‌های دیگر هنوز در صف هستند، PENDING بماند
      const remainingPending = await tx.kycVerification.count({
        where: { customerId: customer.id, status: 'PENDING' },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          kycLevel: 'LEVEL_1',
          kycStatus: remainingPending > 0 ? 'PENDING' : 'APPROVED',
          updatedAt: now,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { phoneNumber: norm.e164, pendingPhone: null },
      });

      // audit log
      await tx.auditLog.create({
        data: {
          id: createId(),
          exchangeId: customer.exchangeId,
          actorId: userId,
          actorRole: 'USER',
          action: 'CUSTOMER_KYC_AUTO_APPROVED',
          entityType: 'KycVerification',
          entityId: '',
          meta: { source: 'telegram-contact', customerId: customer.id },
        },
      });
    });

    return { ok: true };
  } catch {
    return { ok: false, reason: 'db-error' };
  }
}
