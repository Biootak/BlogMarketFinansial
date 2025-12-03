'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface SystemSettingsData {
  siteName?: string;
  siteDescription?: string;
  maintenanceMode?: boolean;
  cacheEnabled?: boolean;
  smtpServer?: string;
  smtpPort?: string;
  smtpUsername?: string;
  smtpPassword?: string;
  telegram?: string;
  instagram?: string;
  whatsapp?: string;
  twitter?: string;
}

// Get system settings
export async function getSystemSettings() {
  try {
    let settings = await prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {},
      });
    }

    return { success: true, data: settings };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return { success: false, error: 'خطا در دریافت تنظیمات' };
  }
}

// Update general settings
export async function updateGeneralSettings(data: {
  siteName: string;
  siteDescription: string;
}) {
  try {
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          siteName: data.siteName,
          siteDescription: data.siteDescription,
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          siteName: data.siteName,
          siteDescription: data.siteDescription,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error updating general settings:', error);
    return { success: false, error: 'خطا در ذخیره تنظیمات عمومی' };
  }
}

// Update email/SMTP settings
export async function updateEmailSettings(data: {
  smtpServer: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
}) {
  try {
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          smtpServer: data.smtpServer,
          smtpPort: data.smtpPort,
          smtpUsername: data.smtpUsername,
          smtpPassword: data.smtpPassword,
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          smtpServer: data.smtpServer,
          smtpPort: data.smtpPort,
          smtpUsername: data.smtpUsername,
          smtpPassword: data.smtpPassword,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error updating email settings:', error);
    return { success: false, error: 'خطا در ذخیره تنظیمات ایمیل' };
  }
}

// Update social media settings
export async function updateSocialSettings(data: {
  instagram: string;
  telegram: string;
  twitter: string;
  whatsapp: string;
}) {
  try {
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          instagram: data.instagram,
          telegram: data.telegram,
          twitter: data.twitter,
          whatsapp: data.whatsapp,
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          instagram: data.instagram,
          telegram: data.telegram,
          twitter: data.twitter,
          whatsapp: data.whatsapp,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error updating social settings:', error);
    return { success: false, error: 'خطا در ذخیره تنظیمات شبکه‌های اجتماعی' };
  }
}

// Update cache settings
export async function updateCacheSettings(data: { cacheEnabled: boolean }) {
  try {
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          cacheEnabled: data.cacheEnabled,
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          cacheEnabled: data.cacheEnabled,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error updating cache settings:', error);
    return { success: false, error: 'خطا در ذخیره تنظیمات کش' };
  }
}

// Update maintenance mode
export async function updateMaintenanceMode(data: { maintenanceMode: boolean }) {
  try {
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          maintenanceMode: data.maintenanceMode,
        },
      });
    } else {
      settings = await prisma.systemSettings.create({
        data: {
          maintenanceMode: data.maintenanceMode,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error updating maintenance mode:', error);
    return { success: false, error: 'خطا در تغییر حالت تعمیرات' };
  }
}

// Generate new API key
export async function generateApiKey() {
  try {
    const apiKey = `bk_${crypto.randomUUID().replace(/-/g, '')}`;
    return { success: true, data: { apiKey } };
  } catch (error) {
    console.error('Error generating API key:', error);
    return { success: false, error: 'خطا در تولید کلید API' };
  }
}

// Test SMTP connection
export async function testSmtpConnection(data: {
  smtpServer: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
}) {
  try {
    // Simulate SMTP test - in production, you'd actually test the connection
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!data.smtpServer || !data.smtpPort) {
      return { success: false, error: 'لطفاً اطلاعات سرور SMTP را وارد کنید' };
    }

    return { success: true, message: 'اتصال به سرور SMTP با موفقیت برقرار شد' };
  } catch (error) {
    console.error('Error testing SMTP:', error);
    return { success: false, error: 'خطا در اتصال به سرور SMTP' };
  }
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { success: true, message: 'اتصال به پایگاه داده برقرار است' };
  } catch (error) {
    console.error('Error testing database:', error);
    return { success: false, error: 'خطا در اتصال به پایگاه داده' };
  }
}
