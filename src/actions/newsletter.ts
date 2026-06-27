'use server';

import prisma from '@/lib/db';
import { z } from 'zod';

const emailSchema = z.string().email();

export async function subscribeToNewsletter(email: string) {
  try {
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
