'use server';

/**
 * Progressive Capture — Server Actions
 *
 * Flow:
 *   1. User submits ServiceRequest form (step 1-3) → createServiceRequest returns trackingCode
 *   2. Client shows step 4 (OTP screen): calls issueServiceOtp({ email, trackingCode })
 *   3. We send a 6-digit code to the email
 *   4. User types code → calls verifyServiceOtpAndLink({ email, code, trackingCode })
 *   5. On success:
 *      a. ServiceRequest.emailVerified = true
 *      b. If a User exists with this email → link ServiceRequest.userId
 *      c. If no User exists → create one (Progressive Capture), set emailVerified, return loginHint
 *
 * Security:
 *   - Rate-limited per IP and per email
 *   - OTP expires in 10 min, max 5 attempts
 *   - trackingCode is validated as belonging to the same email address submitted
 */

import { randomBytes } from 'node:crypto';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { getEmailProviderAsync } from '@/lib/email';
import { serviceVerifyOtpEmail, welcomeSetPasswordEmail } from '@/lib/email/templates';
import { normalizeToE164 } from '@/lib/phone-validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { consumeOtpToken, generateOtpToken } from '@/lib/tokens';
import { headers } from 'next/headers';

// 24-hour window for the welcome/set-password token — longer than the 5-min
// reset token used in normal "forgot password" flow, because the user may
// not check their inbox immediately after submitting a service request.
const WELCOME_TOKEN_EXPIRES_MS = 24 * 60 * 60 * 1000;

async function generateWelcomeToken(email: string): Promise<{ token: string; expiresAt: Date }> {
  const normalizedEmail = email.trim().toLowerCase();
  // Clean any prior welcome tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { email: normalizedEmail, intent: 'reset' },
  });
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + WELCOME_TOKEN_EXPIRES_MS);
  await prisma.verificationToken.create({
    data: {
      email: normalizedEmail,
      token,
      intent: 'reset',
      expires: expiresAt,
      attempts: 0,
    },
  });
  return { token, expiresAt };
}

// ─── Types ────────────────────────────────────────────────────────────────── //

export interface IssueOtpResult {
  success: boolean;
  message: string;
  retryAfterMs?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  /** true when a new account was created via Progressive Capture */
  accountCreated?: boolean;
  /** email to pre-fill on the login page if the user wants to sign in */
  loginHint?: string;
}

// ─── issueServiceOtp ──────────────────────────────────────────────────────── //

export async function issueServiceOtp(args: {
  email: string;
  trackingCode: string;
}): Promise<IssueOtpResult> {
  try {
    const headersList = await headers();
    const ip =
      headersList.get('x-real-ip')?.trim() ||
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';

    // Rate limit: 10 OTP requests per email per 15 min
    const emailRateKey = `service-otp-issue:${args.email.trim().toLowerCase()}`;
    const rateResult = await checkRateLimit(emailRateKey, 'auth');
    if (!rateResult.success) {
      const retryAfterMs = Math.max(0, rateResult.reset - Date.now());
      return {
        success: false,
        message: 'درخواست کد تأیید بیش از حد مجاز است. چند دقیقه صبر کنید.',
        retryAfterMs,
      };
    }

    // IP rate limit: 100 OTP sends per IP per min
    const ipRateKey = `service-otp-issue-ip:${ip}`;
    const ipRate = await checkRateLimit(ipRateKey, 'api');
    if (!ipRate.success) {
      return {
        success: false,
        message: 'تعداد درخواست‌های شما بیش از حد مجاز است.',
      };
    }

    const email = args.email.trim().toLowerCase();
    const trackingCode = args.trackingCode.trim().toUpperCase();

    // Verify trackingCode exists and belongs to this email
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingCode },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!request) {
      return { success: false, message: 'کد پیگیری معتبر نیست.' };
    }

    // The email in the request must match what the user claims
    const requestEmail = request.email?.trim().toLowerCase();
    if (!requestEmail || requestEmail !== email) {
      return {
        success: false,
        message: 'ایمیل وارد شده با ایمیل ثبت‌شده در درخواست مطابقت ندارد.',
      };
    }

    if (request.emailVerified) {
      return { success: false, message: 'ایمیل قبلاً تأیید شده است.' };
    }

    // Generate OTP
    const otpResult = await generateOtpToken({ email, intent: 'service-verify' });
    if (!otpResult.ok) {
      const waitSec = Math.ceil((otpResult as { retryAfterMs: number }).retryAfterMs / 1000);
      return {
        success: false,
        message: `لطفاً ${waitSec} ثانیه صبر کنید و دوباره درخواست کنید.`,
        retryAfterMs: (otpResult as { retryAfterMs: number }).retryAfterMs,
      };
    }

    // Send email (fire-and-forget but we surface errors here since it's critical)
    try {
      const provider = await getEmailProviderAsync();
      await provider.send(
        serviceVerifyOtpEmail({
          to: email,
          code: otpResult.code,
          trackingCode,
          expiresAt: otpResult.expiresAt,
        }),
      );
    } catch {
      return {
        success: false,
        message: 'ارسال ایمیل با خطا مواجه شد. لطفاً ایمیل خود را بررسی کنید.',
      };
    }

    return { success: true, message: 'کد تأیید به ایمیل شما ارسال شد.' };
  } catch {
    return { success: false, message: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.' };
  }
}

// ─── verifyServiceOtpAndLink ──────────────────────────────────────────────── //

export async function verifyServiceOtpAndLink(args: {
  email: string;
  code: string;
  trackingCode: string;
}): Promise<VerifyOtpResult> {
  try {
    const email = args.email.trim().toLowerCase();
    const trackingCode = args.trackingCode.trim().toUpperCase();
    const code = args.code.trim();

    // Validate trackingCode + email match
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingCode },
      select: { id: true, email: true, emailVerified: true, phone: true, fullName: true },
    });

    if (!request) {
      return { success: false, message: 'کد پیگیری معتبر نیست.' };
    }

    const requestEmail = request.email?.trim().toLowerCase();
    if (!requestEmail || requestEmail !== email) {
      return { success: false, message: 'ایمیل وارد شده با درخواست مطابقت ندارد.' };
    }

    if (request.emailVerified) {
      return { success: true, message: 'ایمیل قبلاً تأیید شده است.' };
    }

    // Consume OTP
    const consume = await consumeOtpToken({ email, code, intent: 'service-verify' });
    if (!consume.ok) {
      const messageMap: Record<string, string> = {
        'not-found': 'کد تأیید یافت نشد. لطفاً مجدداً درخواست کنید.',
        expired: 'کد تأیید منقضی شده است. کد جدید درخواست کنید.',
        'too-many-attempts': 'تعداد تلاش‌های مجاز تمام شد. کد جدید درخواست کنید.',
        'wrong-code': 'کد وارد شده اشتباه است.',
      };
      return {
        success: false,
        message: messageMap[consume.reason] ?? 'خطا در تأیید کد.',
      };
    }

    // Check if session is already active (logged-in user submitting the form)
    const session = await auth();
    const sessionUserId = session?.user?.id ?? null;

    let userId: string | null = sessionUserId;
    let accountCreated = false;

    if (!userId) {
      // Look up existing user by email
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Progressive Capture: create a new account
        const tempPassword = randomBytes(16).toString('hex');
        const newUser = await prisma.user.create({
          data: {
            email,
            name: request.fullName,
            // Password is a random hex — unusable until user clicks the welcome link
            password: tempPassword,
            emailVerified: new Date(),
            role: 'USER',
            // Store normalized phone on the user profile if available
            phoneNumber: request.phone ? normalizeToE164(request.phone) : null,
          },
        });
        userId = newUser.id;
        accountCreated = true;

        // 2026-07-10: send welcome email with a one-shot set-password link
        // Fire-and-forget — account is already created; email failure must not
        // roll back the capture.
        (async () => {
          try {
            const { token } = await generateWelcomeToken(email);
            const provider = await getEmailProviderAsync();
            await provider.send(
              welcomeSetPasswordEmail({
                to: email,
                name: request.fullName,
                trackingCode: args.trackingCode.trim().toUpperCase(),
                resetToken: token,
                appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
              }),
            );
          } catch {
            // email failure is non-fatal — user can always use "Forgot Password"
          }
        })();
      }
    }

    // Update this ServiceRequest: mark emailVerified + link userId.
    // Also back-fill any prior guest requests from the same email that
    // were never linked (e.g. submitted before the user had an account).
    await prisma.$transaction([
      prisma.serviceRequest.update({
        where: { id: request.id },
        data: { emailVerified: true, userId },
      }),
      prisma.serviceRequest.updateMany({
        where: {
          email: { equals: email, mode: 'insensitive' },
          userId: null,
          id: { not: request.id },
        },
        data: { userId },
      }),
    ]);

    return {
      success: true,
      message: accountCreated
        ? 'ایمیل تأیید شد و حساب کاربری برای شما ساخته شد!'
        : 'ایمیل با موفقیت تأیید شد.',
      accountCreated,
      loginHint: accountCreated ? email : undefined,
    };
  } catch {
    return { success: false, message: 'خطایی در تأیید ایمیل رخ داد.' };
  }
}
