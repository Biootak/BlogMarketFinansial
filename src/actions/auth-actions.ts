'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth, signIn, signOut } from '@/auth';
import prisma from '@/lib/db';
import { AuthError } from 'next-auth';
import { ForgotPasswordSchema, LoginSchema, MagicLinkSchema, RegisterSchema } from '@/schemas';
import { getUserByEmail } from '@/data/user';
import { DEFAULT_REDIRECT } from '@/config/routes';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/mail';
import { getVerificationTokenByToken } from '@/data/verfication-token';

type AuthResult = {
  success: boolean;
  message?: string;
  error?: string;
  redirect?: string;
};

function handleAuthError(error: unknown): AuthResult {
  if (error instanceof z.ZodError) {
    return { success: false, error: error.errors[0].message };
  }
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

const processFormData = (formData: FormData): { name: string | null; email: string | null; password: string | null; } => {
  return {
    name: formData.get('name') as string | null,
    email: formData.get('email') as string | null,
    password: formData.get('password') as string | null,
  };
};

export async function loginUser(formData: FormData): Promise<AuthResult> {
  try {
    const { email, password } = await LoginSchema.parseAsync(processFormData(formData));

    const existingUser = await getUserByEmail(email);
    if (!existingUser || !existingUser.email || !existingUser.password) {
      return {
        success: false,
        error: 'کاربری با این ایمیل یافت نشد. لطفاً ابتدا ثبت‌نام کنید',
      };
    }

    if (!existingUser.emailVerified) {
      const verificationToken = await generateVerificationToken(existingUser.email);
      await sendVerificationEmail(verificationToken.email, verificationToken.token);

      return {
        success: true,
        message: 'ایمیل تایید برای شما ارسال شد. لطفاً ایمیل خود را بررسی کنید',
      };
    }

    // 2026-06-23: باید از redirectTo استفاده کنیم تا Auth.js کوکی سشن
    // را روی مرورگر ست کند. حالت redirect:false کوکی را فقط در پاسخ
    // fetch داخلی ست می‌کند که هرگز به کلاینت نمی‌رسد؛ در نتیجه حتی
    // بعد از authorize موفق، middleware کاربر را به /signin برمی‌گرداند.
    await signIn('credentials', {
      email,
      password,
      redirectTo: DEFAULT_REDIRECT,
    });

    // این خط اجرا نمی‌شود چون signIn در صورت موفقیت NEXT_REDIRECT پرتاب می‌کند.
    return { success: true, message: 'ورود موفقیت‌آمیز', redirect: DEFAULT_REDIRECT };
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    // NEXT_REDIRECT و سایر خطاهای فریم‌ورکی دوباره پرتاب شوند تا Next.js هدایت کند.
    throw error;
  }
}

export async function registerUser(formData: FormData): Promise<AuthResult> {
  try {
    const { name, email, password } = await RegisterSchema.parseAsync(processFormData(formData));

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return {
        success: false,
        error: 'این ایمیل قبلاً ثبت شده است. لطفاً از ایمیل دیگری استفاده کنید یا وارد حساب خود شوید',
      };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(verificationToken.email, verificationToken.token);

    const loginResult = await loginUser(formData);
    if (!loginResult.success) {
      return loginResult;
    }

    return {
      success: true,
      message: 'ایمیل تایید برای شما ارسال شد. لطفاً ایمیل خود را بررسی کنید',
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function sendMagicLink(formData: FormData): Promise<AuthResult> {
  try {
    const processedData = processFormData(formData);
    const { email } = await MagicLinkSchema.parseAsync(processedData);

    await signIn('resend', {
      email,
      redirect: false,
    });

    return { success: true, message: 'لینک ورود به ایمیل شما ارسال شد.' };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function logout(): Promise<AuthResult> {
  try {
    // 2026-06-23: signOut نیز همانند signIn باید redirect:true داشته باشد تا
    // کوکی سشن از مرورگر پاک شود. ثبت فعالیت خروج در رویداد signOut در
    // src/auth.ts انجام می‌شود چون پس از redirect این کد اجرا نمی‌شود.
    await signOut({ redirectTo: '/signin' });

    // در حالت موفقیت این خط اجرا نمی‌شود چون signOut پس از پاک کردن کوکی NEXT_REDIRECT پرتاب می‌کند.
    return {
      success: true,
      message: 'خروج موفقیت‌آمیز بود',
      redirect: '/signin',
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return handleAuthError(error);
    }
    throw error;
  }
}

export async function newVerification(token: string): Promise<AuthResult> {
  const existingToken = await getVerificationTokenByToken(token);

  if (!existingToken) {
    return {
      success: false,
      error: 'این لینک وجود ندارد.',
    };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();

  if (hasExpired) {
    return {
      success: false,
      error: 'این لینک منقضی شده استت.',
    };
  }

  const existingUser = await getUserByEmail(existingToken.email);

  if (!existingUser) {
    return {
      success: false,
      error: 'این ایمیل در سیستم ما موجود نیست.',
    };
  }

  // 2026-06-14: wrap the two writes in a single transaction.
  // Previously if the token delete succeeded but the user update
  // failed, the user would be left with their email marked
  // unverified and the token gone — a soft lockout. The
  // transaction makes this atomic.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: existingUser.id },
      data: {
        emailVerified: new Date(),
        email: existingToken.email,
      },
    }),
    prisma.verificationToken.delete({
      where: { id: existingToken.id },
    }),
  ]);

  return { success: true, message: 'ایمیل با موفقیت تایید شد.' };
}
