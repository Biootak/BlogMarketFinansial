'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { signIn, signOut } from '@/auth';
import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { AuthError } from 'next-auth';
import { ForgotPasswordSchema, LoginSchema, MagicLinkSchema, RegisterSchema } from '@/schemas';
import { getUserByEmail } from '@/data/user';
import { DEFAULT_REDIRECT } from '@/config/routes';
import { redirect } from 'next/navigation';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/mail';
import { getVerificationTokenByToken } from '@/data/verfication-token';

type AuthResult = {
  success: boolean;
  message?: string;
  error?: string;
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
      redirect: false, // مهم: redirect را false می‌کنیم
    });

    if (result?.error) {
      return { success: false, error: result.error };
    }

    if (result?.ok) {
      // اگر ورود موفقیت‌آمیز بود، ریدایرکت می‌کنیم
      revalidatePath('/');
      return { success: true, message: 'ورود موفقیت‌آمیز' };
    }
    // این خط احتمالاً هرگز اجرا نخواهد شد، اما برای اطمینان آن را نگه می‌داریم
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

    revalidatePath('/');
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
    await signOut({ redirect: false });
    revalidatePath('/');
    return { success: true, message: 'خروج موفقیت‌آمیز بود' };
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
