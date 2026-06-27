'use server';

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { checkExistingSuperAdmin } from '@/lib/auth';
import { headers } from 'next/headers';
import { z } from 'zod';

const prisma = new PrismaClient();

// اعتبارسنجی قوی‌تر با zod
const superAdminSchema = z.object({
  email: z.string().email('ایمیل نامعتبر است'),
  password: z.string()
    .min(12, 'رمز عبور باید حداقل 12 کاراکتر باشد')
    .regex(/[A-Z]/, 'رمز عبور باید شامل حروف بزرگ باشد')
    .regex(/[a-z]/, 'رمز عبور باید شامل حروف کوچک باشد')
    .regex(/[0-9]/, 'رمز عبور باید شامل اعداد باشد')
    .regex(/[^A-Za-z0-9]/, 'رمز عبور باید شامل کاراکترهای خاص باشد'),
  name: z.string().min(2, 'نام باید حداقل 2 حرف داشته باشد'),
  phoneNumber: z.string().regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل نامعتبر است'),
  jobName: z.string().min(2, 'عنوان شغلی باید حداقل 2 حرف داشته باشد'),
  company: z.string().min(2, 'نام شرکت باید حداقل 2 حرف داشته باشد'),
  bio: z.string().min(10, 'بیوگرافی باید حداقل 10 حرف داشته باشد'),
});

export async function createSuperAdmin(formData: FormData) {
  try {
    // بررسی محیط اجرا
    if (process.env.NODE_ENV === 'production') {
      // بررسی IP در محیط تولید
      const headersList = await headers();
      const clientIp = headersList.get('x-forwarded-for') || 'unknown';
      const allowedIps = process.env.ALLOWED_SETUP_IPS?.split(',') || [];
      
      if (!allowedIps.includes(clientIp)) {
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

    // بررسی وجود سوپر ادمین
    const existingAdmin = await checkExistingSuperAdmin(prisma);

    if (existingAdmin) {
      return {
        success: false,
        message: 'تنظیمات اولیه قبلاً انجام شده است. لطفاً وارد سیستم شوید',
        errors: {},
        existingAdmin,
      };
    }

    // رمزنگاری پسورد با سختی بیشتر
    const hashedPassword = await bcrypt.hash(formDataObj.password, 12);

    // ایجاد سوپر ادمین
    const user = await prisma.user.create({
      data: {
        email: formDataObj.email,
        password: hashedPassword,
        name: formDataObj.name,
        phoneNumber: formDataObj.phoneNumber,
        role: Role.SUPER_ADMIN,
        profile: {
          create: {
            jobName: formDataObj.jobName,
            company: formDataObj.company,
            bio: formDataObj.bio,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // ثبت لاگ ایجاد سوپر ادمین
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: `Super admin account created: ${user.email} (ID: ${user.id}) at ${new Date().toISOString()}`,
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
    console.error('Error in createSuperAdmin:', error);
    // ثبت خطا در لاگ سیستم
    await prisma.systemLog.create({
      data: {
        level: 'ERROR',
        message: 'Failed to create super admin account',
        source: 'SETUP',
      },
    });

    const errorMessage = error instanceof Error ? error.message : 'خطایی در پردازش اطلاعات رخ داده است';
    return {
      success: false,
      message: errorMessage,
      errors: {},
      existingAdmin: null,
    };
  }
}
