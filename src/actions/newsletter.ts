'use server';

import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { headers } from 'next/headers';
import { z } from 'zod';

const emailSchema = z
  .string()
  .email()
  .transform((v) => v.trim().toLowerCase());

export async function subscribeToNewsletter(email: string) {
  try {
    // Rate-limit newsletter subscriptions to prevent abuse / email harvesting
    const headersList = await headers();
    const xff = headersList.get('x-forwarded-for');
    const ip = xff
      ? (xff
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .pop() ?? 'unknown')
      : (headersList.get('x-real-ip')?.trim() ?? 'unknown');

    const rl = await checkRateLimit(`newsletter:${ip}`, 'api');
    if (!rl.success) {
      return {
        success: false,
        message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید.',
      };
    }

    const validatedEmail = emailSchema.parse(email);

    // Check if the email already exists
    const existingSubscription = await prisma.newsletter.findUnique({
      where: { email: validatedEmail },
    });

    if (existingSubscription) {
      return { success: false, message: 'این ایمیل قبلاً ثبت شده است.' };
    }

    // If the email doesn't exist, create a new subscription
    await prisma.newsletter.create({
      data: {
        email: validatedEmail,
      },
    });

    return { success: true, message: 'ثبت‌نام در خبرنامه با موفقیت انجام شد.' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: 'لطفاً یک آدرس ایمیل معتبر وارد کنید.' };
    }
    console.error('Error in subscribeToNewsletter:', error);
    return { success: false, message: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.' };
  }
}
