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
//      → consumes the code, applies intent-specific side-effects,
//        then signIn('credentials', {kind:'after_otp', intent})
//   4. Auth.js Credentials.authorize stays the single session gate:
//      password → bcrypt + emailVerified; after_otp → trust pre-verified marker.

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  generateOtpToken,
  consumeOtpToken,
  invalidateOtpTokens,
  type VerificationEmailIntent,
} from '@/lib/tokens';
import {
  EmailLookupSchema,
  LoginSchema,
  RegisterSchema,
  SetPasswordSchema,
  VerifyOtpSchema,
} from '@/schemas';
import { getEmailProvider } from '@/lib/email';
import { otpEmail, otpExpiresLabel } from '@/lib/email/templates';

type AuthStep =
  | 'login'
  | 'register'
  | 'verify'
  | 'recover'
  | 'set-password';

export type AuthResult =
  | {
      success: true;
      message: string;
      step?: AuthStep;
      email?: string;
      intent?: VerificationEmailIntent;
      redirect?: string;
    }
  | {
      success: false;
      error: string;
      cooldownMs?: number;
    };

function handleZodError(error: z.ZodError): AuthResult {
  return { success: false, error: error.errors[0]?.message ?? 'ورودی نامعتبر است' };
}

function handleAuthError(error: unknown): AuthResult {
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
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'خطای ناشناخته' };
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

const EMAIL_COOLDOWN_REGEX = /(لطفاً|ثانیه|دقیقه|صبر)/;
async function dispatchOtpEmail(
  email: string,
  code: string,
  intent: VerificationEmailIntent,
): Promise<void> {
  await getEmailProvider().send(
    otpEmail({ to: email, code, intent, expiresLabel: otpExpiresLabel() }),
  );
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
        error:
          'تعداد درخواست‌ها بیش از حد مجاز است. لحظاتی دیگر دوباره تلاش کنید',
      };
    }

    const user = await prisma.user.findUnique({ where: { email } });

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
    return handleAuthError(error);
  }
}

/**
 * Internal: mints and dispatches an OTP for the given (email, intent).
 * Returns false on resend cooldown so the caller can surface the wait
 * message instead of fabricating a "code sent" success.
 */
async function issueOtp(
  email: string,
  intent: VerificationEmailIntent,
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  const minted = await generateOtpToken({ email, intent });
  if (!minted.ok) {
    return { ok: false, retryAfterMs: minted.retryAfterMs };
  }
  await dispatchOtpEmail(email, minted.code, intent);
  return { ok: true };
}

/**
 * Step 2a: register a fresh user.
 * Bcrypt the password, create the row, then send an OTP for email
 * verification. Returns to the UI with step=verify so the user
 * types the 6-digit code.
 *
 * Failure modes the UI cares about:
 *   - existing email → 409-ish, ask user to use signin
 *   - resend cooldown → bubble cooldownMs up
 *   - signup with an existing-but-unverified email is allowed —
 *     we re-issue the register code and overwrite.
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
        error:
          'تعداد ثبت‌نام‌ها برای این ایمیل بیش از حد مجاز است. لحظاتی دیگر دوباره تلاش کنید',
      };
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing && existing.emailVerified) {
      return {
        success: false,
        error:
          'این ایمیل قبلاً ثبت شده است. لطفاً از ایمیل دیگری استفاده کنید یا وارد شوید',
      };
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    if (existing && !existing.emailVerified) {
      // Reuse the row — overwrite password, drop any prior verification token.
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
    return handleAuthError(error);
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
        error:
          'تعداد تلاش‌های ورود بیش از حد مجاز است. لحظاتی دیگر دوباره تلاش کنید',
      };
    }

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
      const user = await prisma.user.findUnique({
        where: { email: getFormString(formData, 'email') },
      });
      if (user && !user.emailVerified) {
        const sent = await issueOtp(user.email, 'reverify');
        if (sent.ok) {
          return {
            success: false,
            error:
              'ایمیل شما هنوز تأیید نشده است. کد جدید به ایمیل‌تان ارسال شد—لطفاً ابتدا کد را وارد کنید',
          };
        }
      }
      return {
        success: false,
        error:
          'ایمیل یا رمز عبور اشتباه است. لطفاً دوباره تلاش کنید',
      };
    }
    return handleAuthError(error);
  }
}

/**
 * Step 3: consume a 6-digit code and apply intent-specific side-effects.
 * On success, mint an Auth.js session via signIn('credentials', {kind:'after_otp'}).
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
      };
    }

    const result = await consumeOtpToken({
      email: input.email,
      code: input.code,
      intent: input.intent,
    });

    if (!result.ok) {
      switch (result.reason) {
        case 'too-many-attempts':
          return {
            success: false,
            error: 'تعداد تلاش‌های اشتباه به حد مجاز رسید. لطفاً کد جدید درخواست کنید',
          };
        case 'expired':
          return {
            success: false,
            error: 'این کد منقضی شده است. لطفاً کد جدید درخواست کنید',
          };
        default:
          return { success: false, error: 'کد وارد شده صحیح نیست' };
      }
    }

    await applyIntent(input.email, input.intent);

    // Recover intent is special — it doesn't sign the user in; it
    // hands control to setNewPassword.
    if (input.intent === 'recover') {
      return {
        success: true,
        step: 'set-password',
        email: input.email,
        message: 'کد تأیید شد. رمز عبور جدید را انتخاب کنید',
      };
    }

    await signIn('credentials', {
      email: input.email,
      kind: 'after_otp',
      intent: input.intent,
      redirect: false,
    });

    return {
      success: true,
      message: 'تأیید شد. در حال انتقال به داشبورد…',
      redirect: '/dashboard',
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    return handleAuthError(error);
  }
}

/**
 * Step 3.5: user clicked "code didn't arrive / send again".
 * Returns the same step state (verify) so the UI doesn't have to
 * navigate; emits the cooldown so the button can disable itself.
 */
export async function resendOtp(formData: FormData): Promise<AuthResult> {
  try {
    const { email } = await EmailLookupSchema.parseAsync({
      email: getFormString(formData, 'email'),
    });
    const intent = getFormString(
      formData,
      'intent',
    ) as VerificationEmailIntent;

    if (!['register', 'login', 'reverify', 'recover'].includes(intent)) {
      return { success: false, error: 'درخواست نامعتبر' };
    }

    const rate = await checkRateLimit(`resend:${email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد درخواست‌های ارسال مجدد بیش از حد مجاز است',
      };
    }

    const sent = await issueOtp(email, intent);
    if (!sent.ok) {
      return {
        success: false,
        error: 'لطفاً کمی صبر کنید و دوباره درخواست کنید',
        cooldownMs: sent.retryAfterMs,
      };
    }

    return {
      success: true,
      email,
      intent,
      step: 'verify',
      message: 'کد جدید به ایمیل شما ارسال شد',
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    return handleAuthError(error);
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
      };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // 2026-06-23: do not leak account existence — pretend a code was sent.
      return {
        success: true,
        step: 'verify',
        email,
        intent: 'recover',
        message:
          'اگر این ایمیل در سیستم ما وجود داشته باشد، کد بازنشانی ارسال شده است',
      };
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
    return handleAuthError(error);
  }
}

/**
 * Step 4 (recover only): the user just verified with intent=recover
 * and is now picking a new password. We trust the previous verifyOtp
 * call — there is no fresh OTP to consume here.
 */
export async function setNewPassword(formData: FormData): Promise<AuthResult> {
  try {
    const input = await SetPasswordSchema.parseAsync({
      email: getFormString(formData, 'email'),
      password: getFormString(formData, 'password'),
    });

    const rate = await checkRateLimit(`set-password:${input.email}`, 'auth');
    if (!rate.success) {
      return {
        success: false,
        error: 'تعداد تلاش‌های تغییر رمز عبور بیش از حد مجاز است',
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      return {
        success: false,
        error: 'کاربری با این ایمیل یافت نشد',
      };
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailVerified: user.emailVerified ?? new Date(),
      },
    });

    await invalidateOtpTokens({ email: input.email });

    return {
      success: true,
      message: 'رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید',
      step: 'login',
      email: input.email,
    };
  } catch (error) {
    if (error instanceof z.ZodError) return handleZodError(error);
    return handleAuthError(error);
  }
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
    if (error instanceof AuthError) return handleAuthError(error);
    throw error;
  }
}

async function applyIntent(
  email: string,
  intent: VerificationEmailIntent,
): Promise<void> {
  if (intent === 'recover') return; // setNewPassword handles password update

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  if (user.emailVerified) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
}
