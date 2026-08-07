'use server';

import prisma from '@/lib/db';
import { isPhoneValid, normalizeToE164 } from '@/lib/phone-validation';
import { serverLog } from '@/lib/server-logger';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { z } from 'zod';

// اعتبارسنجی قوی‌تر با zod
const superAdminSchema = z.object({
  email: z.string().email('ایمیل نامعتبر است'),
  password: z
    .string()
    .min(12, 'رمز عبور باید حداقل 12 کاراکتر باشد')
    .regex(/[A-Z]/, 'رمز عبور باید شامل حروف بزرگ باشد')
    .regex(/[a-z]/, 'رمز عبور باید شامل حروف کوچک باشد')
    .regex(/[0-9]/, 'رمز عبور باید شامل اعداد باشد')
    .regex(/[^A-Za-z0-9]/, 'رمز عبور باید شامل کاراکترهای خاص باشد'),
  name: z.string().min(2, 'نام باید حداقل 2 حرف داشته باشد'),
  // همان مکانیزم واحد phone-validation: همهٔ کشورها + بلوک شمارهٔ مجازی (VoIP).
  phoneNumber: z.string().refine(isPhoneValid, 'شماره تماس معتبر نیست'),
  jobName: z.string().min(2, 'عنوان شغلی باید حداقل 2 حرف داشته باشد'),
  company: z.string().min(2, 'نام شرکت باید حداقل 2 حرف داشته باشد'),
  bio: z.string().min(10, 'بیوگرافی باید حداقل 10 حرف داشته باشد'),
});

export async function createSuperAdmin(formData: FormData) {
  try {
    // بررسی محیط اجرا
    if (process.env.NODE_ENV === 'production') {
      // بررسی IP در محیط تولید
      // از rightmost entry XFF استفاده می‌کنیم (توسط proxy قابل اعتماد اضافه می‌شود)
      // تا از IP spoofing جلوگیری شود
      const headersList = await headers();
      const xff = headersList.get('x-forwarded-for');
      const clientIp = xff
        ? (xff
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .pop() ?? 'unknown')
        : (headersList.get('x-real-ip')?.trim() ?? 'unknown');
      const allowedIps = process.env.ALLOWED_SETUP_IPS?.split(',').map((ip) => ip.trim()) || [];

      if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
        return {
          success: false,
          message: 'شما مجوز دسترسی به این بخش را ندارید',
          errors: {},
          existingAdmin: null,
        };
      }
    }

    // استخراج داده‌ها از فرم
    const formDataObj = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      jobName: formData.get('jobName') as string,
      company: formData.get('company') as string,
      bio: formData.get('bio') as string,
    };

    // اعتبارسنجی داده‌ها
    const validationResult = superAdminSchema.safeParse(formDataObj);
    if (!validationResult.success) {
      return {
        success: false,
        message: 'لطفاً خطاهای فرم را برطرف کنید',
        errors: validationResult.error.flatten().fieldErrors,
        existingAdmin: null,
      };
    }

    // H2 fix: TOCTOU race. The previous code did a check-then-act
    // (findFirst OWNER, then create) which is non-atomic — two concurrent
    // setup requests could both pass the check and create two OWNERs.
    // Run the existence-check and the create inside a single Serializable
    // transaction so the read+write are atomic. (A definitive guard is a
    // unique partial index on `role` for OWNER, applied at the DB level.)
    const txResult = await prisma.$transaction(
      async (tx) => {
        const existingAdmin = await tx.user.findFirst({ where: { role: Role.OWNER } });
        if (existingAdmin) return { existing: true as const, user: null };

        const hashedPassword = await bcrypt.hash(formDataObj.password, 12);
        // ذخیرهٔ شماره به فرمت استاندارد E.164 (هماهنگ با بقیهٔ اپ)
        const phoneE164 = normalizeToE164(formDataObj.phoneNumber);
        const created = await tx.user.create({
          data: {
            email: formDataObj.email,
            password: hashedPassword,
            name: formDataObj.name,
            phoneNumber: phoneE164,
            role: Role.OWNER,
            profile: {
              create: {
                jobName: formDataObj.jobName,
                company: formDataObj.company,
                bio: formDataObj.bio,
              },
            },
          },
          include: { profile: true },
        });
        return { existing: false as const, user: created };
      },
      { isolationLevel: 'Serializable' },
    );

    if (txResult.existing || txResult.user === null) {
      return {
        success: false,
        message: 'تنظیمات اولیه قبلاً انجام شده است. لطفاً وارد سیستم شوید',
        errors: {},
        existingAdmin: null,
      };
    }

    const user = txResult.user;

    // ثبت لاگ ایجاد مالک (بدون PII plaintext)
    // No email, no user.id, no phone — فقط timestamp + masked شناسه‌ی داخلی.
    // برای audit حرفه‌ای، از event id یا هَش استفاده کنید نه ایمیل خام.
    const [, domain] = user.email.split('@');
    const maskedRef = `${user.id.slice(0, 4)}***@${domain ?? 'unknown'}`;
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `OWNER account created at ${new Date().toISOString()} (ref: ${maskedRef})`,
        source: 'SETUP',
      },
    });

    return {
      success: true,
      message: 'تنظیمات اولیه با موفقیت انجام شد',
      errors: {},
      existingAdmin: null,
    };
  } catch (error: unknown) {
    // Sentry + SystemLog — بدون این، شکست ساخت حساب OWNER فقط یک پیام
    // عمومی فارسی بود و علت واقعی هیچ‌جا ثبت نمی‌شد.
    serverLog.error('setup', 'create-super-admin', error);

    // ثبت خطا در لاگ سیستم (بدون PII)
    try {
      await prisma.systemLog.create({
        data: {
          level: 'ERROR',
          message: 'createSuperAdmin failed',
          source: 'SETUP',
        },
      });
    } catch (logError) {
      serverLog.error('setup', 'create-super-admin-log-write', logError);
    }

    return {
      success: false,
      message: 'خطایی در ایجاد حساب رخ داد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
      errors: {},
      existingAdmin: null,
    };
  }
}
