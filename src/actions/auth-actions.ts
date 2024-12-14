'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth, signIn, signOut } from '@/auth';
import prisma from '@/lib/db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { AuthError } from 'next-auth';
import { ForgotPasswordSchema, LoginSchema, MagicLinkSchema, RegisterSchema } from '@/schemas';
import { getUserByEmail } from '@/data/user';
import { DEFAULT_REDIRECT } from '@/config/routes';
import { redirect } from 'next/navigation';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/mail';
import { getVerificationTokenByToken } from '@/data/verfication-token';
import {
  invalidateUserProfile,
  invalidateDashboardCache,
  clearAllUserRelatedCaches,
} from '@/services/cacheService';

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

const processFormData = (formData: FormData) => {
  return {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
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
      // پاک کردن کامل کش‌های کاربر
      if (existingUser.id) {
        await clearAllUserRelatedCaches(existingUser.id);
      }

      // تازه‌سازی تمام مسیرهای داشبورد
      const dashboardPaths = [
        '/dashboard',
        '/dashboard/posts',
        '/dashboard/users',
        '/dashboard/categories',
        '/dashboard/advertisements',
        '/dashboard/exchange-rates',
        '/dashboard/rate-lists',
        '/dashboard/settings',
        '/dashboard/reports',
        '/dashboard/edit-profile',
      ];

      dashboardPaths.forEach((path) => revalidatePath(path));

      // تازه‌سازی سایر مسیرهای اصلی
      revalidatePath('/');
      revalidatePath('/profile');
      revalidatePath('/market');
      revalidatePath('/portfolio');

      // بازگشت با هدایت مستقیم به داشبورد
      return {
        success: true,
        message: 'ورود موفقیت‌آمیز',
        redirect: '/dashboard', // اضافه کردن مسیر ریدایرکت
      };
    }

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
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(verificationToken.email, verificationToken.token);

    const loginResult = await loginUser(formData);
    if (!loginResult.success) {
      return loginResult;
    }

    // پاک کردن کش کاربر جدید
    if (newUser.id) {
      await invalidateUserProfile(newUser.id);
      await invalidateDashboardCache(newUser.id);
    }

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    revalidatePath('/market');
    revalidatePath('/portfolio');
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
    const session = await auth();
    await signOut({ redirect: false });

    // پاک کردن کامل کش‌های کاربر خارج شده
    if (session?.user?.id) {
      await clearAllUserRelatedCaches(session.user.id);
    }

    // تازه‌سازی تمام مسیرهای داشبورد
    const dashboardPaths = [
      '/dashboard',
      '/dashboard/posts',
      '/dashboard/users',
      '/dashboard/categories',
      '/dashboard/advertisements',
      '/dashboard/exchange-rates',
      '/dashboard/rate-lists',
      '/dashboard/settings',
      '/dashboard/reports',
      '/dashboard/edit-profile',
    ];

    dashboardPaths.forEach((path) => revalidatePath(path));

    // تازه‌سازی سایر مسیرهای اصلی
    revalidatePath('/');
    revalidatePath('/profile');
    revalidatePath('/market');
    revalidatePath('/portfolio');

    return {
      success: true,
      message: 'خروج موفقیت‌آمیز بود',
      redirect: '/signin', // هدایت به صفحه ورود
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

  const updatedUser = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      emailVerified: new Date(),
      email: existingToken.email,
    },
  });
  await prisma.verificationToken.delete({
    where: { id: existingToken.id },
  });

  // پاک کردن کش کاربر تأیید شده
  if (updatedUser.id) {
    await invalidateUserProfile(updatedUser.id);
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/profile');
  revalidatePath('/market');
  revalidatePath('/portfolio');
  return { success: true, message: 'ایمیل با موفقیت تایید شد.' };
}

// export async function forgotPassword(formData: FormData): Promise<AuthResult> {
// 	try {
// 		const { email } = await ForgotPasswordSchema.parseAsync(
// 			processFormData(formData),
// 		);

// 		const user = await prisma.user.findUnique({ where: { email } });
// 		if (!user) {
// 			return {
// 				success: true,
// 				message:
// 					"اگر این ایمیل در سیستم ما موجود باشد، لینک بازیابی ارسال خواهد شد.",
// 			};
// 		}

// 		// TODO: ارسال ایمیل بازیابی رمز عبور
// 		// await sendPasswordResetEmail(user.email);

// 		revalidatePath("/forgot-password");
// 		return {
// 			success: true,
// 			message: "لینک بازیابی رمز عبور به ایمیل شما ارسال شد.",
// 		};
// 	} catch (error) {
// 		return handleAuthError(error);
// 	}
// }
