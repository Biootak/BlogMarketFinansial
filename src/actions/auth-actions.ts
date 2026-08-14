'use server';

// 2026-06-23: unified auth pipeline.
// One OTP table, one OTP code, one email template, four intents:
// register / login (passwordless for OAuth-only users) / reverify / recover.
//
// Flow shape:
//   1. lookupEmail({email})
//      → decides which step comes next: register | login | verify
//   2. register form / login form submit
//      → either creates the user or runs verify (depending on state)
//   3. verifyOtp({email, code, intent})
//      → consumes the code, applies intent-specific side-effects.
//        For non-recover intents: signIn('credentials', {kind:'after_otp'}).
//        For recover: mints a short-lived reset secret the client must
//        hand back to setNewPassword. Without that secret, setNewPassword
//        refuses to rewrite the password — closing P0-1.
//   4. Auth.js Credentials.authorize stays the single session gate:
//      password → bcrypt + emailVerified; after_otp → trust pre-verified marker.

import { signIn, signOut } from '@/auth';
import prisma from '@/lib/db';
import { getEmailProviderAsync } from '@/lib/email';
import { type OtpEmailIntent, otpEmail, otpExpiresLabel } from '@/lib/email/templates';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter';
import { serverLog } from '@/lib/server-logger';
import {
  type VerificationEmailIntent,
  beginTwoFactorChallenge,
  consumeOtpToken,
  consumePasswordResetToken,
  createTwoFactorChallenge,
  finishTwoFactorChallenge,
  generateLoginToken,
  generateOtpToken,
  generatePasswordResetToken,
  invalidateOtpTokens,
} from '@/lib/tokens';
import { verifyTotp } from '@/lib/totp';
import { decryptTotpSecret } from '@/lib/totp-secrets';
import {
  EmailLookupSchema,
  LoginSchema,
  RegisterSchema,
  ResendOtpSchema,
  SetPasswordSchema,
  VerifyOtpSchema,
} from '@/schemas';
import { Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// 2026-06-30: Next 16's `revalidateTag` requires a second `profile`
// argument; the wrapper at @/lib/revalidate always passes 'max'.
// Importing from `next/cache` directly would fail the type-check.
import { revalidateTag } from '@/lib/revalidate';

const BCRYPT_COST = 12;

// 2026-06-24: only allow overwriting an unverified user row when the
// row is "fresh" (created less than this many minutes ago). Outside the
// window, a brand-new create attempt should be rejected even if no
// verified user exists, so an attacker can't squat on an abandoned
// email by repeatedly calling registerUser.
const REGISTER_OVERWRITE_WINDOW_MS = 30 * 60 * 1000;

type AuthStep = 'login' | 'register' | 'verify' | 'recover' | 'set-password';

export type AuthResult =
  | {
      success: true;
      message: string;
      step?: AuthStep;
      email?: string;
      intent?: VerificationEmailIntent;
      // 2026-06-24: present only on `recover` verify success. Client must
      // hand it back to setNewPassword in the same browser session.
      resetToken?: string;
      redirect?: string;
    }
  | {
      success: false;
      error: string;
      cooldownMs?: number;
    };

function handleZodError(error: z.ZodError): AuthResult {
  return {
    success: false,
    error: error.errors[0]?.message ?? 'ورودی نامعتبر است',
  };
}

/**
 * 2026-06-24: never leak internal error messages (Prisma constraints,
 * bcrypt failures, network errors) to the client. Only known auth errors
 * get specific copy; everything else falls back to a generic message and
 * is logged on the server for ops.
 */
function handleAuthError(error: unknown, context: string): AuthResult {
  if (error instanceof z.ZodError) return handleZodError(error);
  if (error instanceof AuthError) {
    switch (error.type) {
      case 'CredentialsSignin':
        return {
          success: false,
          error: 'ایمیل یا رمز عبور اشتباه است. لطفاً دوباره تلاش کنید',
        };
      case 'AccessDenied':
        return {
          success: false,
          error: 'دسترسی به این حساب مسدود است یا ایمیل هنوز تأیید نشده است',
        };
      default:
        return {
          success: false,
          error: 'مشکلی در ورود به حساب پیش آمده. لطفاً دوباره تلاش کنید',
        };
    }
  }
  // 2026-08-14: خطاهای اتصال/اعتبارسنجی دیتابیس → پیام واضح، نه «خطای موقتی»
  // مبهم. (این شاخه فقط بعد از withDbRetry می‌رسد — تلاش مجدد قبلاً انجام شده.)
  if (isDbConnectivityError(error)) {
    serverLog.error('auth-actions', `${context}-db-connectivity`, error);
    return {
      success: false,
      error: 'ارتباط با سرور برقرار نشد. لطفاً چند لحظه دیگر دوباره تلاش کنید',
    };
  }
  // Unknown / internal — log with context, return generic.
  serverLog.error('auth-actions', context, error);
  return {
    success: false,
    error: 'خطای موقتی در سامانه. لطفاً لحظاتی دیگر دوباره تلاش کنید',
  };
}

// ─── DB Connectivity hardening (2026-08-14) ──────────────────────────────────
// مشکل گزارش‌شده: کاربر هنگام ورود/2FA «خطای موقتی در سامانه» می‌گرفت. ریشهٔ
// واقعی، خطاهای اتصال به دیتابیس بود (ConnectionReset از سمت RDS، pool timeout
// در connection_limit=1، یا اعتبارنامهٔ کهنه) که به‌صورت error نامشخص به
// handleAuthError می‌رسید. اینجا دو رفتار اضافه می‌کنیم:
//   ۱. خطاهای گذرای اتصال → یک بار دیگر با تأخیر کوتاه تلاش می‌شود (اتصال تازه
//      معمولاً موفق است).
//   ۲. هر خطای اتصال/اعتبارسنجی DB که باز هم رخ دهد → پیام واضح «ارتباط با
//      سرور برقرار نشد» به‌جای «خطای موقتی» مبهم + لاگ مشخص برای ops.

// گذرا — تلاش مجدد منطقی است (Prisma بعد از reset با اتصال جدید دوباره وصل می‌شود)
const TRANSIENT_DB_ERROR_RE =
  /P1001|P1008|P1017|can't reach database|timed out fetching|connectionreset|connection (reset|closed|pool)|pool (timeout|timed out)|connect(_|-)?timeout|ECONNRESET|ETIMEDOUT/i;

// هر خطای ارتباط/اعتبارسنجی دیتابیس — تلاش مجدد فایده ندارد ولی پیام باید واضح باشد
const DB_CONNECTIVITY_ERROR_RE =
  /database|postgres|connection|pool|authentication|timed out|P1001|P1008|P1017/i;

function isTransientDbError(error: unknown): boolean {
  return error instanceof Error && TRANSIENT_DB_ERROR_RE.test(error.message);
}

function isDbConnectivityError(error: unknown): boolean {
  return error instanceof Error && DB_CONNECTIVITY_ERROR_RE.test(error.message);
}

/**
 * یک بار تلاش مجدد برای خطاهای گذرای اتصال به دیتابیس.
 * اگر تلاش دوم هم به خطای گذرا بخورد، به‌جای throw (که 500 می‌سازد)
 * نتیجهٔ واضح «ارتباط با سرور برقرار نشد» برمی‌گردانیم.
 */
async function withDbRetry(fn: () => Promise<AuthResult>): Promise<AuthResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error)) throw error;
      serverLog.warn('auth-actions', 'db-transient-retry', error);
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  serverLog.error('auth-actions', 'db-connectivity-after-retry', lastError);
  return {
    success: false,
    error: 'ارتباط با سرور برقرار نشد. لطفاً چند لحظه دیگر دوباره تلاش کنید',
  };
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

/**
 * IP کلاینت از rightmost X-Forwarded-For (که proxy قابل‌اعتماد اضافه می‌کند)
 * تا از spoofing جلوگیری شود — همان الگوی createSuperAdmin.
 */
async function getClientIp(): Promise<string | undefined> {
  try {
    const h = await headers();
    const xff = h.get('x-forwarded-for');
    return xff
      ? (xff
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .pop() ?? undefined)
      : h.get('x-real-ip')?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * لایه تشخیص: هر رویداد امنیتی مربوط به حساب مالک در auditLog ثبت می‌شود
 * (ورود موفق/ناموفق/چالش 2FA) تا اگر حسابی هک شد یا تلاش هک شد، سریع
 * در داشبورد audit-log دیده شود. شکست logging هرگز auth را نمی‌شکند.
 */
async function logOwnerSecurityEvent(
  action: string,
  userId: string,
  ip?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: createId(),
        exchangeId: null,
        actorId: userId,
        actorRole: Role.OWNER,
        action,
        entityType: 'User',
        entityId: userId,
        ip,
        meta: (meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // logging must never break the auth flow
  }
}

async function dispatchOtpEmail(
  email: string,
  code: string,
  intent: OtpEmailIntent,
): Promise<void> {
  const provider = await getEmailProviderAsync();
  await provider.send(otpEmail({ to: email, code, intent, expiresLabel: otpExpiresLabel() }));
}

/**
 * Internal: mints and dispatches an OTP for the given (email, intent).
 * Returns false on resend cooldown so the caller can surface the wait
 * message instead of fabricating a "code sent" success.
 */
async function issueOtp(
  email: string,
  intent: OtpEmailIntent,
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  const minted = await generateOtpToken({ email, intent });
  if (!minted.ok) {
    return { ok: false, retryAfterMs: minted.retryAfterMs };
  }
  await dispatchOtpEmail(email, minted.code, intent);
  return { ok: true };
}

/**
 * Step 1: ask "whoever owns this email, what comes next?".
 * - unknown email → register step
 * - known, unverified → reverify (idempotent — if a token already exists,
 *   resend call returns cooldown instead of double-sending)
 * - known, verified, has-password → login step
 * - known, verified, no password (OAuth-only) → login via OTP
 */
export async function lookupEmail(formData: FormData): Promise<AuthResult> {
  return withDbRetry(() => lookupEmailImpl(formData));
}

async function lookupEmailImpl(formData: FormData): Promise<AuthResult> {
  try {
    const { email } = await EmailLookupSchema.parseAsync({
      email: getFormString(formData, 'email'),
    });

    const rate = await checkRateLimit(`email-lookup:${email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد درخواست‌ها بیش از حد مجاز است. لحظاتی دیگر دوباره تلاش کنید',
        cooldownMs: Math.max(0, rate.reset - Date.now()),
      };
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      return {
        success: true,
        step: 'register',
        email,
        message: 'برای ساخت حساب، نام و رمز عبور را انتخاب کنید',
      };
    }

    if (!user.emailVerified) {
      await issueOtp(email, 'reverify');
      return {
        success: true,
        step: 'verify',
        email,
        intent: 'reverify',
        message: 'کد تأیید به ایمیل شما ارسال شد. لطفاً ایمیل خود را بررسی کنید',
      };
    }

    if (user.password) {
      return {
        success: true,
        step: 'login',
        email,
        message: 'برای ورود، رمز عبور را وارد کنید',
      };
    }

    await issueOtp(email, 'login');
    return {
      success: true,
      step: 'verify',
      email,
      intent: 'login',
      message: 'کد ورود به ایمیل شما ارسال شد',
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    if (isTransientDbError(error)) throw error; // withDbRetry یک بار دیگر تلاش می‌کند
    return handleAuthError(error, 'lookupEmail');
  }
}

/**
 * Step 2a: register a fresh user.
 * Bcrypt the password, create the row, then send an OTP for email
 * verification. Returns to the UI with step=verify so the user
 * types the 6-digit code.
 *
 * Failure modes the UI cares about:
 *   - existing verified email → 409-ish, ask user to use signin
 *   - resend cooldown → bubble cooldownMs up
 *   - signup with an existing-but-unverified email is allowed ONLY
 *     when the row was created in the last REGISTER_OVERWRITE_WINDOW_MS
 *     minutes. Older abandoned rows are treated like verified rows so
 *     attackers can't squat on them by spamming register calls.
 */
export async function registerUser(formData: FormData): Promise<AuthResult> {
  return withDbRetry(() => registerUserImpl(formData));
}

async function registerUserImpl(formData: FormData): Promise<AuthResult> {
  try {
    const input = await RegisterSchema.parseAsync({
      name: getFormString(formData, 'name'),
      email: getFormString(formData, 'email'),
      password: getFormString(formData, 'password'),
    });

    const rate = await checkRateLimit(`register:${input.email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد ثبت‌نام‌ها برای این ایمیل بیش از حد مجاز است. لحظاتی دیگر دوباره تلاش کنید',
        cooldownMs: Math.max(0, rate.reset - Date.now()),
      };
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing?.emailVerified) {
      return {
        success: false,
        error: 'این ایمیل قبلاً ثبت شده است. لطفاً از ایمیل دیگری استفاده کنید یا وارد شوید',
      };
    }

    if (existing && !existing.emailVerified) {
      // 2026-06-24: only allow overwrite inside the freshness window.
      const ageMs = Date.now() - existing.createdAt.getTime();
      if (ageMs > REGISTER_OVERWRITE_WINDOW_MS) {
        return {
          success: false,
          error:
            'پیش از این برای این ایمیل ثبت‌نام ناتمامی ثبت شده که منقضی شده است. لطفاً از مسیر بازیابی رمز عبور اقدام کنید یا با پشتیبانی تماس بگیرید',
        };
      }
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_COST);

    if (existing && !existing.emailVerified) {
      // Reuse the row inside the freshness window — overwrite password,
      // drop any prior verification tokens.
      await prisma.user.update({
        where: { id: existing.id },
        data: { name: input.name, password: hashedPassword },
      });
      await invalidateOtpTokens({ email: input.email });
    } else {
      await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
        },
      });
    }

    const sent = await issueOtp(input.email, 'register');
    if (!sent.ok) {
      return {
        success: false,
        error: 'لطفاً کمی صبر کنید و دوباره درخواست کد کنید',
        cooldownMs: sent.retryAfterMs,
      };
    }

    return {
      success: true,
      step: 'verify',
      email: input.email,
      intent: 'register',
      message: 'کد تأیید به ایمیل شما ارسال شد',
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    if (isTransientDbError(error)) throw error;
    return handleAuthError(error, 'registerUser');
  }
}

/**
 * Step 2b: password login for verified users.
 * If the user is unverified, transparently kicks off reverify so they
 * don't get stuck. The sign-in is delegated to Auth.js so the cookie
 * write happens in one place.
 */
export async function loginWithPassword(formData: FormData): Promise<AuthResult> {
  return withDbRetry(() => loginWithPasswordImpl(formData));
}

async function loginWithPasswordImpl(formData: FormData): Promise<AuthResult> {
  try {
    const input = await LoginSchema.parseAsync({
      email: getFormString(formData, 'email'),
      password: getFormString(formData, 'password'),
    });

    const rate = await checkRateLimit(`login:${input.email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. لحظاتی دیگر دوباره تلاش کنید',
        cooldownMs: Math.max(0, rate.reset - Date.now()),
      };
    }

    // C1-fix (2026-08-01): TOTP 2FA enforcement.
    // قبلاً کاربری که 2FA فعال می‌کرد هیچ حفاظت اضافه‌ای نمی‌گرفت — login فقط
    // bcrypt + emailVerified را چک می‌کرد. حالا اگر twoFactorEnabled است:
    //   1. رمز را با bcrypt خودمان (بدون signIn) تأیید می‌کنیم
    //   2. یک challenge یکبارمصرف (intent='2fa') می‌سازیم
    //   3. به مرحلهٔ verify برمی‌گردیم تا کاربر کد Authenticator را وارد کند
    //   4. verifyTotpLogin آن را مصرف می‌کند و با single-use loginToken سشن می‌سازد
    // (رمز در DB ذخیره نمی‌شود؛ با همان hashing موجود)
    const twoFaUser = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      select: {
        id: true,
        twoFactorEnabled: true,
        password: true,
        emailVerified: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (twoFaUser?.twoFactorEnabled) {
      // اطمینان: رمز واقعاً درست است (بدون signIn — تا مرحلهٔ TOTP)
      if (!twoFaUser.password) {
        return { success: false, error: 'ایمیل یا رمز عبور اشتباه است' };
      }
      const pwOk = await bcrypt.compare(input.password, twoFaUser.password);
      if (!pwOk) {
        if (twoFaUser.role === Role.OWNER || twoFaUser.role === Role.SUPERADMIN) {
          await logOwnerSecurityEvent('OWNER_LOGIN_FAILED', twoFaUser.id, await getClientIp());
        }
        return { success: false, error: 'ایمیل یا رمز عبور اشتباه است' };
      }
      // 2026-08-12: banned/suspended → مسدود کردن ورود با پیام واضح
      if (twoFaUser.status !== 'Active') {
        return {
          success: false,
          error: 'دسترسی به این حساب غیرفعال شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
        };
      }
      if (!twoFaUser.emailVerified) {
        const sent = await issueOtp(input.email, 'reverify');
        if (sent.ok) {
          // 2026-08-09 fix: unverified login used to return success:false with
          // only a message — the user was told to enter the code but the UI
          // stayed on the login form (no OTP field) → dead end. Move to the
          // verify step instead, like lookupEmail does for unverified users.
          return {
            success: true,
            step: 'verify',
            email: input.email,
            intent: 'reverify',
            message:
              'ایمیل شما هنوز تأیید نشده است. کد جدید به ایمیل‌تان ارسال شد—لطفاً آن را وارد کنید',
          };
        }
        return { success: false, error: 'ایمیل شما هنوز تأیید نشده است' };
      }

      // challenge یکبارمصرف — گواهی اینکه عامل اول (رمز) همین حالا تأیید شد.
      // 2026-08-09 fix: توکن قبلی (email,intent) را اول حذف می‌کنیم —
      // در غیر این صورت وقتی کاربر ورود را نیمه‌کاره رها کند یا دوبار
      // submit کند، create با unique constraint (email,intent) fail
      // می‌شود و خطای عمومی «خطای موقتی در سامانه» نشان داده می‌شود.
      // 2026-08-14: منطق به createTwoFactorChallenge منتقل شد تا مرحلهٔ
      // verify هم بتواند با beginTwoFactorChallenge همان row را claim کند.
      await createTwoFactorChallenge(input.email);

      if (twoFaUser.role === Role.OWNER || twoFaUser.role === Role.SUPERADMIN) {
        await logOwnerSecurityEvent('OWNER_LOGIN_2FA_CHALLENGE', twoFaUser.id, await getClientIp());
      }

      return {
        success: true,
        step: 'verify',
        email: input.email,
        intent: '2fa',
        message: 'کد احراز هویت دو مرحله‌ای (Authenticator) را وارد کنید',
      };
    }

    // OWNER/SUPERADMIN: 2FA اجباری و دائمی است. اولین ورود (وقتی هنوز
    // فعال نشده) مجاز است ولی مستقیم به صفحه‌ی فعال‌سازی 2FA می‌رود؛ از
    // ورود دوم به بعد همیشه challenge TOTP گرفته می‌شود (بلوک بالا).
    // غیرفعال‌کردن 2FA برای مالک هم در twoFactorActions بسته شده است.
    if (twoFaUser?.role === Role.OWNER || twoFaUser?.role === Role.SUPERADMIN) {
      if (!twoFaUser.password) {
        return { success: false, error: 'ایمیل یا رمز عبور اشتباه است' };
      }
      const pwOk = await bcrypt.compare(input.password, twoFaUser.password);
      if (!pwOk) {
        if (twoFaUser.role === Role.OWNER || twoFaUser.role === Role.SUPERADMIN) {
          await logOwnerSecurityEvent('OWNER_LOGIN_FAILED', twoFaUser.id, await getClientIp());
        }
        return { success: false, error: 'ایمیل یا رمز عبور اشتباه است' };
      }
      // 2026-08-12: banned/suspended → مسدود کردن ورود با پیام واضح
      if (twoFaUser.status !== 'Active') {
        return {
          success: false,
          error: 'دسترسی به این حساب غیرفعال شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
        };
      }
      if (!twoFaUser.emailVerified) {
        const sent = await issueOtp(input.email, 'reverify');
        if (sent.ok) {
          // 2026-08-09 fix: same dead-end as the 2FA branch above —
          // transition to the verify step so the user can enter the code.
          return {
            success: true,
            step: 'verify',
            email: input.email,
            intent: 'reverify',
            message:
              'ایمیل شما هنوز تأیید نشده است. کد جدید به ایمیل‌تان ارسال شد—لطفاً آن را وارد کنید',
          };
        }
        return { success: false, error: 'ایمیل شما هنوز تأیید نشده است' };
      }

      // نشست بساز تا بتواند 2FA را فعال کند — ولی مستقیم به صفحه‌ی
      // فعال‌سازی هدایت شود؛ اولین کار بعد از ورود، فعال‌سازی 2FA است.
      await signIn('credentials', {
        email: input.email,
        password: input.password,
        kind: 'password',
        redirect: false,
      });

      await logOwnerSecurityEvent('OWNER_LOGIN_2FA_PENDING', twoFaUser.id, await getClientIp());
      await resetRateLimit(`login:${input.email.toLowerCase()}`, 'auth');

      const ownerLabel = twoFaUser.role === Role.OWNER ? 'مالک' : 'سوپرادمین';
      return {
        success: true,
        message: `برای حساب ${ownerLabel}، احراز هویت دو مرحله‌ای (2FA) اجباری است. لطفاً همین حالا آن را فعال کنید.`,
        redirect: '/2fa-setup',
      };
    }

    // بدون 2FA — مسیر قبلی
    await signIn('credentials', {
      email: input.email,
      password: input.password,
      kind: 'password',
      redirect: false,
    });

    // UX-fix: ورود موفق نباید تلاش‌های قبلی را به حساب بیاورد — شمارنده را
    // ریست کن تا فقط تلاش‌های ناموفق brute-force شمارش شوند.
    await resetRateLimit(`login:${input.email.toLowerCase()}`, 'auth');

    return {
      success: true,
      message: 'خوش آمدید! در حال انتقال به داشبورد…',
      redirect: '/dashboard',
    };
  } catch (error) {
    // Special case: AuthError mapped to AuthResult, but we also want
    // to handle 'CredentialsSignin' with an extra hint — if the user
    // is unverified, prompt them to verify first.
    if (error instanceof AuthError && error.type === 'CredentialsSignin') {
      // 2026-08-03: use case-insensitive lookup for consistency with rest of auth pipeline.
      const emailInput = getFormString(formData, 'email');
      const user = await prisma.user.findFirst({
        where: { email: { equals: emailInput, mode: 'insensitive' } },
      });
      if (user && !user.emailVerified) {
        const sent = await issueOtp(user.email, 'reverify');
        if (sent.ok) {
          // 2026-08-09 fix: dead-end — the code was sent but the UI had no
          // OTP field on the login step. Move to verify so the user can
          // enter the code.
          return {
            success: true,
            step: 'verify',
            email: user.email,
            intent: 'reverify',
            message:
              'ایمیل شما هنوز تأیید نشده است. کد جدید به ایمیل‌تان ارسال شد—لطفاً آن را وارد کنید',
          };
        }
      }
      return {
        success: false,
        error: 'ایمیل یا رمز عبور اشتباه است. لطفاً دوباره تلاش کنید',
      };
    }
    if (isTransientDbError(error)) throw error;
    return handleAuthError(error, 'loginWithPassword');
  }
}

/**
 * Step 3: consume a 6-digit code and apply intent-specific side-effects.
 *
 * For non-recover intents: signIn('credentials', {kind:'after_otp'}).
 * For recover: mints a short-lived reset secret and returns it. The
 * client threads this secret back to setNewPassword — without it,
 * setNewPassword refuses. The secret is single-use (TTL 5min) and is
 * never emailed or persisted anywhere outside the VerificationToken
 * row.
 */
export async function verifyOtp(formData: FormData): Promise<AuthResult> {
  return withDbRetry(() => verifyOtpImpl(formData));
}

async function verifyOtpImpl(formData: FormData): Promise<AuthResult> {
  try {
    const input = await VerifyOtpSchema.parseAsync({
      email: getFormString(formData, 'email'),
      code: getFormString(formData, 'code'),
      intent: getFormString(formData, 'intent') as VerificationEmailIntent,
    });

    const rate = await checkRateLimit(`verify:${input.email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد تلاش‌های تأیید بیش از حد مجاز است. لحظاتی دیگر دوباره تلاش کنید',
        cooldownMs: Math.max(0, rate.reset - Date.now()),
      };
    }

    // برای intent='2fa' کد از اپلیکیشن Authenticator (TOTP) می‌آید
    // نه از ایمیل. challenge قبلاً در loginWithPassword ساخته شده؛ اینجا
    // TOTP را با secret ذخیره‌شده چک و challenge را consume می‌کنیم.
    if (input.intent === '2fa') {
      // H1-fix: rate-limit اختصاصی برای TOTP verify (جلوگیری از brute-force کد Authenticator)
      const totpRate = await checkRateLimit(`2fa-verify:${input.email}`, 'auth');
      if (!totpRate.success) {
        return {
          success: false,
          error: 'تعداد تلاش‌های احراز هویت دو مرحله‌ای بیش از حد است. لطفاً چند دقیقه صبر کنید',
          cooldownMs: Math.max(0, totpRate.reset - Date.now()),
        };
      }
      const twoFaUser = await prisma.user.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' } },
        select: {
          id: true,
          twoFactorEnabled: true,
          twoFactorSecretEnc: true,
          emailVerified: true,
          email: true,
          role: true,
          status: true,
        },
      });
      if (!twoFaUser?.twoFactorEnabled || !twoFaUser.twoFactorSecretEnc) {
        return {
          success: false,
          error: 'احراز هویت دو مرحله‌ای برای این حساب فعال نیست',
        };
      }
      // 2026-08-12: banned/suspended → حتی با TOTP معتبر هم ورود ممنوع
      if (twoFaUser.status !== 'Active') {
        return {
          success: false,
          error: 'دسترسی به این حساب غیرفعال شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
        };
      }
      if (!twoFaUser.emailVerified) {
        return { success: false, error: 'ایمیل شما تأیید نشده است' };
      }

      // ── گارد عامل اول (P0 fix — 2026-08-14) ──
      // challenge باید از قبل توسط loginWithPassword (یا callback OAuth)
      // ساخته شده باشد؛ وجودش تنها گواهیِ این است که رمز/هویت provider همین
      // حالا تأیید شده. قبلاً این تابع فقط `deleteMany` می‌زد و count را
      // نادیده می‌گرفت — یعنی هرکس با یک کد TOTP معتبر (یا کد پشتیبانِ لو
      // رفته) و بدون هیچ رمزی می‌توانست سشن بسازد: احراز دو‌عاملی در عمل
      // یک‌عاملی می‌شد و پنجرهٔ ۲ دقیقه‌ای هم اعمال نمی‌شد.
      // claim قبل از بررسی کد انجام می‌شود تا هر تلاش — حتی تلاشی که وسط
      // راه crash کند — از سهمیهٔ attempts کم شود.
      const challenge = await beginTwoFactorChallenge({ email: input.email });
      if (!challenge.ok) {
        serverLog.warn('auth-actions', '2fa-challenge-missing', {
          email: input.email,
          reason: challenge.reason,
        });
        return {
          success: false,
          error:
            challenge.reason === 'too-many-attempts'
              ? 'تعداد تلاش‌های اشتباه به حد مجاز رسید. لطفاً از ابتدا وارد شوید'
              : 'مهلت ورود دو مرحله‌ای به پایان رسیده است. لطفاً دوباره با رمز عبور وارد شوید',
        };
      }

      // C2-fix: decrypt secret رمزنگاری‌شده قبل از verify
      // G1-fix: اگر AUTH_SECRET اشتباه باشد یا secret خراب شده باشد،
      // decryptTotpSecret خطا می‌دهد و به handleAuthError می‌رود → «خطای موقتی».
      // اینجا صریحاً catch می‌کنیم تا پیام مناسب بدهیم.
      // G3-fix (2026-08-14): خرابی decrypt نباید ورود را کامل قفل کند —
      // کد پشتیبان (bcrypt، مستقل از AUTH_SECRET) هنوز می‌تواند کاربر را
      // وارد کند. قبلاً اینجا return می‌شد و مسیر کد پشتیبان هرگز اجرا
      // نمی‌شد؛ حساب با secret خراب/نامنطبق برای همیشه قفل می‌ماند.
      let totpSecret: string | null = null;
      let decryptFailed = false;
      try {
        totpSecret = decryptTotpSecret(twoFaUser.twoFactorSecretEnc);
      } catch (decryptErr) {
        serverLog.error('auth-actions', 'decrypt-totp-secret', decryptErr);
        decryptFailed = true;
      }

      let totpOk = false;
      if (totpSecret !== null) {
        totpOk = await verifyTotp(totpSecret, input.code);
      }

      // ── کد پشتیبان (backup code) ──
      // اگر TOTP درست نبود، کد پشتیبان ۸ کاراکتری (هگز) را هم امتحان کن.
      // کاربری که اپ Authenticator را گم/عوض کرده باشد با کد پشتیبان
      // (که هنگام فعال‌سازی دریافت کرده) باید بتواند وارد شود؛ در غیر این
      // صورت حسابش برای همیشه قفل می‌ماند. کد پشتیبان یک‌بارمصرف است و به
      // AUTH_SECRET وابسته نیست — پس حتی وقتی decrypt شکست می‌خورد هم اجرا
      // می‌شود (G3-fix).
      let backupCodeId: string | null = null;
      if (!totpOk) {
        const normalized = input.code.trim().toUpperCase();
        if (/^[A-F0-9]{8}$/.test(normalized)) {
          const backupCodes = await prisma.twoFactorBackupCode.findMany({
            where: { userId: twoFaUser.id, usedAt: null },
            select: { id: true, codeHash: true },
          });
          for (const bc of backupCodes) {
            if (await bcrypt.compare(normalized, bc.codeHash)) {
              backupCodeId = bc.id;
              break;
            }
          }
        }
      }

      if (!totpOk && !backupCodeId) {
        // 2026-08-14: challenge را حذف نمی‌کنیم — attempts در
        // beginTwoFactorChallenge افزایش یافته و سقف ۵ تلاش، brute-force را
        // (۵ حدس از ۱٫۰۰۰٫۰۰۰ حالت) محدود می‌کند. قبلاً یک اشتباه تایپی کل
        // challenge را می‌سوزاند و کاربر باید از ابتدا رمز می‌زد.
        if (twoFaUser.role === Role.OWNER || twoFaUser.role === Role.SUPERADMIN) {
          await logOwnerSecurityEvent('OWNER_LOGIN_FAILED', twoFaUser.id, await getClientIp());
        }
        return {
          success: false,
          error: decryptFailed
            ? 'خطای داخلی در احراز هویت. لطفاً با پشتیبانی تماس بگیرید (کد: TOTP-DEC)'
            : challenge.attemptsLeft > 0
              ? `کد احراز هویت نادرست است. ${challenge.attemptsLeft} تلاش باقی مانده است`
              : 'کد احراز هویت نادرست است. لطفاً دوباره با رمز عبور وارد شوید',
        };
      }

      // challenge را مصرف کن — یکبارمصرف
      await finishTwoFactorChallenge(challenge.challengeId);

      // کد پشتیبان را یک‌بارمصرف کن
      if (backupCodeId) {
        await prisma.twoFactorBackupCode.update({
          where: { id: backupCodeId },
          data: { usedAt: new Date() },
        });
      }

      // single-use login token + signIn — همان الگوی امن after_otp
      try {
        const loginToken = await generateLoginToken(input.email);
        await signIn('credentials', {
          email: input.email,
          kind: 'after_otp',
          loginToken: loginToken.token,
          intent: input.intent,
          redirect: false,
        });
      } catch (signInErr) {
        serverLog.error('auth-actions', 'verifyTotpLogin/signIn', signInErr);
        return {
          success: false,
          error: 'کد تأیید شد ولی ورود با خطا مواجه شد. لطفاً دوباره از ابتدا اقدام کنید',
        };
      }

      // لایه تشخیص: ورود موفق مالک با TOTP ثبت می‌شود
      if (twoFaUser.role === Role.OWNER || twoFaUser.role === Role.SUPERADMIN) {
        await logOwnerSecurityEvent('OWNER_LOGIN', twoFaUser.id, await getClientIp());
      }

      // UX-fix: ورود موفق شمارنده را ریست می‌کند
      await resetRateLimit(`login:${input.email.toLowerCase()}`, 'auth');
      await resetRateLimit(`2fa-verify:${input.email.toLowerCase()}`, 'auth');

      return {
        success: true,
        message: 'تأیید شد. در حال انتقال…',
        redirect: '/dashboard',
      };
    }

    const result = await consumeOtpToken({
      email: input.email,
      code: input.code,
      intent: input.intent,
    });

    if (!result.ok) {
      // 2026-06-24: unified error message — don't reveal whether the
      // token exists, expired, or had a wrong code. Only the explicit
      // "too-many-attempts" path keeps its distinct copy so users
      // know to request a fresh code.
      if (result.reason === 'too-many-attempts') {
        return {
          success: false,
          error: 'تعداد تلاش‌های اشتباه به حد مجاز رسید. لطفاً کد جدید درخواست کنید',
        };
      }
      return {
        success: false,
        error: 'کد نامعتبر یا منقضی شده است. لطفاً دوباره درخواست دهید',
      };
    }

    await applyIntent(input.email, input.intent);

    // Recover intent: don't sign the user in — mint a reset secret
    // and hand control to setNewPassword.
    if (input.intent === 'recover') {
      const reset = await generatePasswordResetToken(input.email);
      return {
        success: true,
        step: 'set-password',
        email: input.email,
        resetToken: reset.token,
        message: 'کد تأیید شد. برای ادامه، رمز عبور جدید را وارد کنید',
      };
    }

    // ── 2FA در مسیر OTP ایمیلی هم اجباری است (P0 fix — 2026-08-14) ──
    // قبلاً فقط loginWithPassword عامل دوم را می‌گرفت. مسیرهای
    // login/reverify/register/service-verify مستقیم signIn می‌کردند، یعنی
    // هرکس به ایمیل قربانی دسترسی داشت (یا یک OTP نشت‌کرده داشت) کل TOTP را
    // دور می‌زد — حسابی که 2FA فعال کرده بود در این مسیرها هیچ حفاظت اضافه‌ای
    // نداشت. کد ایمیلیِ مصرف‌شده اینجا نقش عامل اول را دارد و challenge
    // یکبارمصرف TOTP ساخته می‌شود.
    const twoFaCheck = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      select: { twoFactorEnabled: true, twoFactorSecretEnc: true },
    });
    if (twoFaCheck?.twoFactorEnabled && twoFaCheck.twoFactorSecretEnc) {
      await createTwoFactorChallenge(input.email);
      return {
        success: true,
        step: 'verify',
        email: input.email,
        intent: '2fa',
        message: 'کد احراز هویت دو مرحله‌ای (Authenticator) را وارد کنید',
      };
    }

    // B1: signIn can fail after OTP was consumed (DB blip in
    // events.signIn). Wrap and surface a clear error; the user will
    // need to request a new code, but that's an acceptable cost vs.
    // a half-authenticated session.
    try {
      // 2026-07-08: mint a single-use login token proving a real OTP was just
      // consumed, and hand it to the credentials signIn. authorize() consumes it,
      // closing the after_otp account-takeover bypass (C2).
      const loginToken = await generateLoginToken(input.email);
      await signIn('credentials', {
        email: input.email,
        kind: 'after_otp',
        loginToken: loginToken.token,
        intent: input.intent,
        redirect: false,
      });
    } catch (signInErr) {
      serverLog.error('auth-actions', 'verifyOtp/signIn', signInErr);
      return {
        success: false,
        error: 'تأیید موفق بود ولی ورود با خطا مواجه شد. لطفاً دوباره درخواست کد کنید',
      };
    }

    return {
      success: true,
      message: 'تأیید شد. در حال انتقال…',
      redirect: '/dashboard',
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    if (isTransientDbError(error)) throw error;
    return handleAuthError(error, 'verifyOtp');
  }
}

/**
 * Step 3.5: user clicked "code didn't arrive / send again".
 * Returns the same step state (verify) so the UI doesn't have to
 * navigate; emits the cooldown so the button can disable itself.
 *
 * B5: validate `intent` with Zod (was an Array.includes before, which
 * silently accepted typos and let attackers overwrite recovery tokens
 * with register tokens).
 */
export async function resendOtp(formData: FormData): Promise<AuthResult> {
  return withDbRetry(() => resendOtpImpl(formData));
}

async function resendOtpImpl(formData: FormData): Promise<AuthResult> {
  try {
    const input = await ResendOtpSchema.parseAsync({
      email: getFormString(formData, 'email'),
      intent: getFormString(formData, 'intent'),
    });

    const rate = await checkRateLimit(`resend:${input.email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد درخواست‌های ارسال مجدد بیش از حد مجاز است',
        cooldownMs: Math.max(0, rate.reset - Date.now()),
      };
    }

    const sent = await issueOtp(input.email, input.intent);
    if (!sent.ok) {
      return {
        success: false,
        error: 'لطفاً کمی صبر کنید و دوباره درخواست کنید',
        cooldownMs: sent.retryAfterMs,
      };
    }

    return {
      success: true,
      email: input.email,
      intent: input.intent,
      step: 'verify',
      message: 'کد جدید به ایمیل شما ارسال شد',
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    if (isTransientDbError(error)) throw error;
    return handleAuthError(error, 'resendOtp');
  }
}

/**
 * Forgot-password entry point. Same shape as lookupEmail's verify path
 * but with intent=recover so consumeOtpToken matches the right code.
 */
export async function recoverPassword(formData: FormData): Promise<AuthResult> {
  return withDbRetry(() => recoverPasswordImpl(formData));
}

async function recoverPasswordImpl(formData: FormData): Promise<AuthResult> {
  try {
    const { email } = await EmailLookupSchema.parseAsync({
      email: getFormString(formData, 'email'),
    });

    const rate = await checkRateLimit(`recover:${email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد درخواست‌های بازنشانی رمز عبور بیش از حد مجاز است',
        cooldownMs: Math.max(0, rate.reset - Date.now()),
      };
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (!user) {
      // 2026-06-23: do not leak account existence — pretend a code was sent.
      return {
        success: true,
        step: 'verify',
        email,
        intent: 'recover',
        message: 'اگر این ایمیل در سیستم ما وجود داشته باشد، کد بازنشانی ارسال شده است',
      };
    }

    // امنیت: هر درخواست بازیابی رمز برای حساب مالک ثبت می‌شود (audit trail).
    // حتی اگر کسی ایمیل مالک را در اختیار داشته باشد، ورود بدون TOTP ممکن
    // نیست — 2FA برای مالک اجباری است (loginWithPassword).
    if (user.role === Role.OWNER || user.role === Role.SUPERADMIN) {
      try {
        await prisma.systemLog.create({
          data: {
            level: 'WARN',
            message: `Password recovery requested for OWNER account at ${new Date().toISOString()}`,
            source: 'AUTH',
          },
        });
      } catch (_logErr) {
        // log failure must never break the recovery flow
      }
    }

    const sent = await issueOtp(email, 'recover');
    if (!sent.ok) {
      return {
        success: false,
        error: 'لطفاً کمی صبر کنید و دوباره درخواست کنید',
        cooldownMs: sent.retryAfterMs,
      };
    }

    return {
      success: true,
      step: 'verify',
      email,
      intent: 'recover',
      message: 'کد بازنشانی به ایمیل شما ارسال شد',
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    if (isTransientDbError(error)) throw error;
    return handleAuthError(error, 'recoverPassword');
  }
}

/**
 * Step 4 (recover only): the user just verified with intent=recover
 * and is now picking a new password. They MUST present the resetToken
 * returned by verifyOtp — without it, anyone who guesses the email
 * could rewrite the password. The token is single-use and 5-min TTL.
 *
 * Side effect: the email is now considered verified (the user proved
 * ownership by submitting a valid OTP).
 */
export async function setNewPassword(formData: FormData): Promise<AuthResult> {
  return withDbRetry(() => setNewPasswordImpl(formData));
}

async function setNewPasswordImpl(formData: FormData): Promise<AuthResult> {
  try {
    const input = await SetPasswordSchema.parseAsync({
      email: getFormString(formData, 'email'),
      resetToken: getFormString(formData, 'resetToken'),
      password: getFormString(formData, 'password'),
    });

    const rate = await checkRateLimit(`set-password:${input.email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد تلاش‌های تغییر رمز عبور بیش از حد مجاز است',
        cooldownMs: Math.max(0, rate.reset - Date.now()),
      };
    }

    const consumed = await consumePasswordResetToken({
      email: input.email,
      token: input.resetToken,
    });
    if (!consumed.ok) {
      return {
        success: false,
        error:
          consumed.reason === 'expired'
            ? 'نشست بازنشانی منقضی شده است. لطفاً دوباره درخواست کد کنید'
            : 'نشست بازنشانی نامعتبر است. لطفاً از ابتدا اقدام کنید',
      };
    }

    // 2026-08-03: use findFirst with case-insensitive match (consistent
    // with the rest of the auth pipeline) and return a generic error that
    // does NOT confirm whether the email exists — prevents user enumeration.
    const user = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
    });
    if (!user) {
      return {
        success: false,
        error: 'نشست بازنشانی نامعتبر است. لطفاً از ابتدا اقدام کنید',
      };
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_COST);
    // 2026-06-30: atomic password rotation. Wrapping the user.update +
    // OTP cleanup in a single transaction prevents the failure mode
    // where the password changes but stale OTPs survive (letting the
    // same 5-min window continue to work with the new password's
    // emailVerified marker flipped). bcrypt.hash is intentionally
    // OUTSIDE the transaction — it's CPU-bound and would hold the
    // pool connection open for ~250ms at cost 12.
    //
    // Using the interactive `$transaction(async (tx) => {...})` form
    // rather than the array form so the body can call ordinary async
    // helpers (Prisma's array form requires every element to be a
    // PrismaPromise, which our invalidateOtpTokens wrapper was not).
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          // 2026-06-24: password reset proves email ownership — set
          // emailVerified as a side effect of the OTP we already consumed
          // (applyIntent skipped it for recover).
          emailVerified: user.emailVerified ?? new Date(),
          // 2026-08-13: reset رمز — هر session قبلی این کاربر باطل شود.
          passwordVersion: { increment: 1 },
        },
      });
      await tx.verificationToken.deleteMany({ where: { email: input.email } });
    });

    // 2026-06-30: bust cached dashboard slices so the next render
    // reflects the new password + verified email without waiting
    // for the 24h JWT rolling refresh.
    revalidateTag(`user-${user.id}`);
    revalidateTag('dashboard-stats');
    revalidateTag('sidebar-data');

    return {
      success: true,
      message: 'رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید',
      step: 'login',
      email: input.email,
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    if (isTransientDbError(error)) throw error;
    return handleAuthError(error, 'setNewPassword');
  }
}

/**
 * 2026-06-24: simplified logout. signOut({redirect:false}) clears the
 * session cookie via the headers it returns; the client then pushes
 * `/auth` so the AuthGroupLayout kicks in fresh. We don't need a
 * manual redirect here — the action result just signals success.
 */
/**
 * فهرست provider های ورود اجتماعی فعال در این محیط — برای SocialProviders.
 * فقط production (تصمیم ۲۰۲۶-۰۸-۱۰): در dev ورود با گوگل/گیت‌هاب غیرفعال
 * است و فقط Credentials (OTP/رمز) کار می‌کند — تا دکمه‌ای که خطا می‌دهد
 * نمایش داده نشود و مجبور به نگه‌داری دو OAuth app (dev+prod) نباشیم.
 *
 * این تصمیم runtime است، نه build: در Docker بیلد env های AUTH_* وجود
 * ندارند، پس نمی‌شود presence آن‌ها را در زمان ساخت قضاوت کرد. این action
 * در runtime اجرا می‌شود و NODE_ENV + credential های واقعی را می‌بیند.
 */
export async function getEnabledSocialProviders(): Promise<string[]> {
  if (process.env.NODE_ENV !== 'production') return [];
  const providers: string[] = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push('google');
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push('github');
  return providers;
}

export async function logout(): Promise<AuthResult> {
  try {
    await signOut({ redirect: false });
    return {
      success: true,
      message: 'خروج موفقیت‌آمیز',
      redirect: '/auth',
    };
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error, 'logout');
    serverLog.error('auth-actions', 'logout', error);
    return {
      success: false,
      error: 'خروج با خطا مواجه شد. لطفاً دوباره تلاش کنید',
    };
  }
}

async function applyIntent(email: string, intent: VerificationEmailIntent): Promise<void> {
  // For recover, the password update + emailVerified flip happen in
  // setNewPassword. We don't touch the user row here so a half-reset
  // (verify ok, set-password never called) leaves the account intact.
  if (intent === 'recover') return;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (!user) return;
  if (user.emailVerified) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
}
