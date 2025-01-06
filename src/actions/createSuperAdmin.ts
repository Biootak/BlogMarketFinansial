'use server';

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { checkExistingSuperAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function createSuperAdmin(formData: FormData) {
  try {
    console.log('Starting createSuperAdmin...');
    // اطلاعات اصلی کاربر
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;

    // اطلاعات پروفایل
    const bio = formData.get('bio') as string;
    const jobName = formData.get('jobName') as string;
    const company = formData.get('company') as string;

    console.log('Validating input data...');
    // اعتبارسنجی داده‌های ورودی
    if (!email || !password || !name) {
      console.log('Missing required fields');
      return {
        success: false,
        message: 'لطفاً تمام اطلاعات ضروری را تکمیل کنید',
        errors: {},
        existingAdmin: null,
      };
    }

    console.log('Checking for existing admin...');
    const existingAdmin = await checkExistingSuperAdmin(prisma);

    if (existingAdmin) {
      console.log('Admin already exists');
      return {
        success: false,
        message: 'تنظیمات اولیه قبلاً انجام شده است. لطفاً وارد سیستم شوید',
        errors: {},
        existingAdmin,
      };
    }

    console.log('Creating new admin...');
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        status: 'Active',
        emailVerified: new Date(),
        phoneNumber,
        profile: {
          create: {
            bio,
            jobName,
            company,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    console.log('Admin created successfully');
    return {
      success: true,
      message: 'تنظیمات اولیه با موفقیت انجام شد',
      errors: {},
      existingAdmin: null,
    };
  } catch (error: unknown) {
    console.error('Error in createSuperAdmin:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطایی در پردازش اطلاعات رخ داده است';
    return {
      success: false,
      message: errorMessage,
      errors: {},
      existingAdmin: null,
    };
  }
}
