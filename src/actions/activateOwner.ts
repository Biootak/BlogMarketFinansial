'use server';

import prisma from '@/lib/db';
import { normalizeToE164 } from '@/lib/phone-validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  OWNER_SETUP_INTENT,
  consumeOwnerSetupInvite,
  normalizeOwnerEmail,
} from '@/lib/setup/activation';
import { ownerActivationSchema } from '@/lib/setup/server-schema';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Phase 2 — the owner completes their own account via the invite link.
 *
 * Counterpart of `createSuperAdmin` for the handover flow: instead of the
 * operator bootstrapping the OWNER, the owner proves the invite (single-use
 * token, 72h TTL) and fills in identity/credentials/profile themselves.
 *
 * Security posture — deliberately different from `createSuperAdmin`:
 *   - No `ALLOWED_SETUP_IPS` gate. The invite token IS the authorization,
 *     and the real owner is usually remote; an IP allow-list would break
 *     the handover (and the token is far stronger than an IP check).
 *   - The token is consumed atomically (deleteMany gate) inside the first
 *     transaction, so a used/expired link can never be replayed.
 *   - bcrypt is hashed OUTSIDE the transaction (CPU-bound ~250ms at cost
 *     13 would hold a pool connection); completion runs in a second
 *     transaction that also re-checks the row is still Pending.
 *   - Rate-limited per email with the same fail-closed 'auth' limiter as
 *     the rest of the setup/auth surface.
 */

// همان cost 13 که createSuperAdmin برای مالک استفاده می‌کند — مالک مهم‌ترین
// حساب سامانه است و ساخت/فعال‌سازی آن نادر است، پس هزینهٔ اضافه قابل‌قبول است.
const OWNER_BCRYPT_COST = 13;

export interface ActivateOwnerResult {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export async function activateOwner(formData: FormData): Promise<ActivateOwnerResult> {
  const email = normalizeOwnerEmail(String(formData.get('email') ?? ''));

  const rate = await checkRateLimit(`activate-owner:${email}`, 'auth');
  if (!rate.success) {
    return {
      success: false,
      message: 'تعداد تلاش‌های بیش از حد مجاز. لطفاً کمی بعد دوباره تلاش کنید',
    };
  }

  const parsed = ownerActivationSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    phoneNumber: formData.get('phoneNumber'),
    jobName: formData.get('jobName'),
    company: formData.get('company'),
    bio: formData.get('bio'),
    token: formData.get('token'),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: 'لطفاً خطاهای فرم را برطرف کنید',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { token, ...payload } = parsed.data;

  try {
    // ── Gate 1: consume the invite (atomic, single-use) + read pending owner ──
    const consumed = await consumeOwnerSetupInvite(token, email);
    if (!consumed.ok) {
      return {
        success: false,
        message: 'لینک دعوت نامعتبر یا منقضی شده است. لطفاً از مالک سامانه لینک جدیدی دریافت کنید.',
      };
    }

    const hashedPassword = await bcrypt.hash(payload.password, OWNER_BCRYPT_COST);
    const phoneE164 = normalizeToE164(payload.phoneNumber);

    // ── Gate 2: complete the account — only if it is STILL Pending ──
    const completed = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: consumed.user.id, role: Role.OWNER, status: 'Pending' },
        data: {
          name: payload.name,
          password: hashedPassword,
          phoneNumber: phoneE164,
          emailVerified: new Date(),
          status: 'Active',
          // Invalidate any session minted while the row was Pending (there
          // should be none — no password — but keep the invariant cheap).
          tokenVersion: { increment: 1 },
        },
      });
      if (updated.count === 0) return false;

      await tx.profile.upsert({
        where: { userId: consumed.user.id },
        create: {
          userId: consumed.user.id,
          jobName: payload.jobName,
          company: payload.company,
          bio: payload.bio,
        },
        update: {
          jobName: payload.jobName,
          company: payload.company,
          bio: payload.bio,
        },
      });

      // Burn any leftover invites for this email (defence in depth).
      await tx.verificationToken.deleteMany({
        where: { email, intent: OWNER_SETUP_INTENT },
      });

      return true;
    });

    if (!completed) {
      return {
        success: false,
        message:
          'حساب مالک قبلاً فعال شده است یا وضعیت آن تغییر کرده. لطفاً از طریق صفحه‌ی ورود وارد شوید.',
      };
    }

    // Audit log بدون PII خام — فقط timestamp + مرجع ماسک‌شده (همان الگوی createSuperAdmin).
    const [, domain] = payload.email.split('@');
    const maskedRef = `${consumed.user.id.slice(0, 4)}***@${domain ?? 'unknown'}`;
    try {
      await prisma.systemLog.create({
        data: {
          level: 'INFO',
          message: `OWNER account activated via invite at ${new Date().toISOString()} (ref: ${maskedRef})`,
          source: 'SETUP',
        },
      });
    } catch {
      // لاگ نویسی نباید موفقیت فعال‌سازی را به هم بزند.
    }

    return {
      success: true,
      message: 'حساب مالک با موفقیت فعال شد',
    };
  } catch (_error: unknown) {
    try {
      await prisma.systemLog.create({
        data: {
          level: 'ERROR',
          message: 'activateOwner failed',
          source: 'SETUP',
        },
      });
    } catch {
      // ignore log failures
    }
    return {
      success: false,
      message: 'خطایی در فعال‌سازی حساب رخ داد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
    };
  }
}
