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
import { checkRateLimit } from '@/lib/rate-limiter';
import { serverLog } from '@/lib/server-logger';
import {
  type VerificationEmailIntent,
  consumeOtpToken,
  consumePasswordResetToken,
  generateLoginToken,
  generateOtpToken,
  generatePasswordResetToken,
  generateSixDigitCode,
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
  // Unknown / internal — log with context, return generic.
  serverLog.error('auth-actions', context, error);
  return {
    success: false,
    error: 'خطای موقتی در سامانه. لطفاً لحظاتی دیگر دوباره تلاش کنید',
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

      // challenge یکبارمصرف — فقط با کد TOTP معتبر قابل مصرف.
      // 2026-08-09 fix: توکن قبلی (email,intent) را اول حذف می‌کنیم —
      // در غیر این صورت وقتی کاربر ورود را نیمه‌کاره رها کند یا دوبار
      // submit کند، create با unique constraint (email,intent) fail
      // می‌شود و خطای عمومی «خطای موقتی در سامانه» نشان داده می‌شود.
      await prisma.verificationToken.deleteMany({
        where: { email: input.email.toLowerCase(), intent: '2fa' },
      });
      await prisma.verificationToken.create({
        data: {
          email: input.email.toLowerCase(),
          token: generateSixDigitCode(),
          intent: '2fa',
          expires: new Date(Date.now() + 2 * 60 * 1000),
          attempts: 0,
        },
      });

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

      return {
        success: true,
        message:
          'برای حساب مالک، احراز هویت دو مرحله‌ای (2FA) اجباری است. لطفاً همین حالا آن را فعال کنید.',
        redirect: '/dashboard/edit-profile?2fa=required',
      };
    }

    // بدون 2FA — مسیر قبلی
    await signIn('credentials', {
      email: input.email,
      password: input.password,
      kind: 'password',
      redirect: false,
    });

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
        },
      });
      if (!twoFaUser?.twoFactorEnabled || !twoFaUser.twoFactorSecretEnc) {
        return {
          success: false,
          error: 'احراز هویت دو مرحله‌ای برای این حساب فعال نیست',
        };
      }
      if (!twoFaUser.emailVerified) {
        return { success: false, error: 'ایمیل شما تأیید نشده است' };
      }
      // C2-fix: decrypt secret رمزنگاری‌شده قبل از verify
      const totpOk = await verifyTotp(decryptTotpSecret(twoFaUser.twoFactorSecretEnc), input.code);
      if (!totpOk) {
        // consume challenge را به‌گونه‌ای انجام می‌دهیم که brute-force محدود بماند
        await prisma.verificationToken.deleteMany({
          where: { email: input.email.toLowerCase(), intent: '2fa' },
        });
        return {
          success: false,
          error: 'کد احراز هویت نادرست است. دوباره امتحان کنید',
        };
      }

      // challenge را مصرف کن — یکبارمصرف
      await prisma.verificationToken.deleteMany({
        where: { email: input.email.toLowerCase(), intent: '2fa' },
      });

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
    return handleAuthError(error, 'resendOtp');
  }
}

/**
 * Forgot-password entry point. Same shape as lookupEmail's verify path
 * but with intent=recover so consumeOtpToken matches the right code.
 */
export async function recoverPassword(formData: FormData): Promise<AuthResult> {
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
    return handleAuthError(error, 'setNewPassword');
  }
}

/**
 * 2026-06-24: simplified logout. signOut({redirect:false}) clears the
 * session cookie via the headers it returns; the client then pushes
 * `/auth` so the AuthGroupLayout kicks in fresh. We don't need a
 * manual redirect here — the action result just signals success.
 */
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
