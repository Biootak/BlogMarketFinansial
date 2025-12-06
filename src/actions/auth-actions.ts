'use server';

import { auth, signIn, signOut } from '@/auth';
import { DEFAULT_REDIRECT } from '@/config/routes';
import { getUserByEmail } from '@/data/user';
import { getVerificationTokenByToken } from '@/data/verfication-token';
import prisma from '@/lib/db';
import { sendVerificationEmail } from '@/lib/mail';
import { generateVerificationToken } from '@/lib/tokens';
import { ForgotPasswordSchema, LoginSchema, MagicLinkSchema, RegisterSchema } from '@/schemas';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// تابع کمکی برای ثبت فعالیت ورود (بدون نیاز به session)
async function logLoginActivity(userId: string, action: string, details: string) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, details },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

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
          error: 'مشکلی در ورود به حساب پیش آمده. لطفاً دوباره تلاش کنید',
        };
      default:
        return {
          success: false,
          error: 'ایمیل یا رمز عبور اشتباه است. لطفاً دوباره تلاش کنید',
        };
    }
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: 'خطای ناشناخته' };
}

const processFormData = (
  formData: FormData,
): { name: string | null; email: string | null; password: string | null } => {
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

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: result.error };
    }

    if (result?.ok) {
      // به‌روزرسانی سشن با اطلاعات جدید کاربر
      const session = await auth();
      if (session) {
        session.user = {
          ...session.user,
          role: existingUser.role,
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        };
      }

      // ثبت فعالیت ورود
      await logLoginActivity(
        existingUser.id,
        'ورود به سیستم',
        `کاربر "${existingUser.name || existingUser.email}" وارد سیستم شد`,
      );

      return {
        success: true,
        message: 'ورود موفقیت‌آمیز',
        redirect: '/dashboard',
      };
    }

    // ثبت فعالیت ورود
    await logLoginActivity(
      existingUser.id,
      'ورود به سیستم',
      `کاربر "${existingUser.name || existingUser.email}" وارد سیستم شد`,
    );

    return { success: true, message: 'ورود موفقیت‌آمیز. در حال انتقال به صفحه اصلی...' };
  } catch (error) {
    return handleAuthError(error);
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
    // دریافت اطلاعات کاربر قبل از خروج
    const session = await auth();
    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email;

    await signOut({ redirect: false });

    // ثبت فعالیت خروج
    if (userId) {
      await logLoginActivity(userId, 'خروج از سیستم', `کاربر "${userName}" از سیستم خارج شد`);
    }

    return {
      success: true,
      message: 'خروج موفقیت‌آمیز بود',
      redirect: '/signin',
    };
  } catch (error) {
    return handleAuthError(error);
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

  await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      emailVerified: new Date(),
      email: existingToken.email,
    },
  });

  await prisma.verificationToken.delete({
    where: { id: existingToken.id },
  });

  return { success: true, message: 'ایمیل با موفقیت تایید شد.' };
}
