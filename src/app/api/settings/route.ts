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

    if (!body.siteName || !body.siteUrl) {
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
          data: body,
        });
      } else {
        settings = await db.systemSettings.create({
          data: body,
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
