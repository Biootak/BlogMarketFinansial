import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, message: 'شما دسترسی لازم را ندارید' },
        { status: 401 },
      );
    }

    const settings = await db.systemSettings.findFirst();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Settings API [GET] - Error:', error);
    return NextResponse.json({ success: false, message: 'خطای داخلی سرور' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, message: 'شما دسترسی لازم را ندارید' },
        { status: 401 },
      );
    }

    const body = await req.json();

    // 2026-07-08: whitelist fields. Previously the entire request body was
    // passed straight to Prisma, allowing mass assignment of any column
    // (H11). Only known SystemSettings scalar fields are accepted.
    const ALLOWED_SETTINGS_FIELDS = [
      'siteName',
      'siteDescription',
      'logoUrl',
      'maintenanceMode',
      'cacheEnabled',
      'smtpServer',
      'smtpPort',
      'smtpUsername',
      'smtpPassword',
      'telegram',
      'instagram',
      'whatsapp',
      'twitter',
    ] as const;
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_SETTINGS_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    // logoUrl is optional; normalize empty strings to null
    if (data.logoUrl === '') {
      data.logoUrl = null;
    }

    if (!data.siteName) {
      return NextResponse.json(
        { success: false, message: 'لطفاً فیلدهای اجباری را پر کنید' },
        { status: 400 },
      );
    }

    try {
      let settings = await db.systemSettings.findFirst();

      if (settings) {
        settings = await db.systemSettings.update({
          where: { id: settings.id },
          data,
        });
      } else {
        settings = await db.systemSettings.create({
          data,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'تنظیمات با موفقیت ذخیره شد',
        data: settings,
      });
    } catch (dbError) {
      console.error('Settings API [POST] - Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'خطا در ذخیره تنظیمات در دیتابیس' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Settings API [POST] - Error:', error);
    return NextResponse.json({ success: false, message: 'خطای داخلی سرور' }, { status: 500 });
  }
}
