import { auth } from '@/auth';
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || !['OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'شما دسترسی لازم را ندارید' } },
        { status: 403 },
      );
    }

    const settings = await db.systemSettings.findFirst();
    // L5 fix: never return the SMTP password (secret) in the API response.
    if (settings) {
      const { smtpPassword: _omit, ...safeSettings } = settings as Record<string, unknown>;
      return NextResponse.json({ success: true, data: safeSettings });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'خطای داخلی سرور' } },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user || !['OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'شما دسترسی لازم را ندارید' } },
        { status: 403 },
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
      'siteUrl',
      'maintenanceMode',
      'cacheEnabled',
      'smtpServer',
      'smtpPort',
      'smtpUsername',
      'smtpPassword',
      'contactEmail',
      'contactPhone',
      'contactAddress',
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
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: 'لطفاً فیلدهای اجباری را پر کنید' },
        },
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
        // L5 fix: strip the SMTP password from the response payload.
        data: (() => {
          const { smtpPassword: _omit, ...safe } = settings as Record<string, unknown>;
          return safe;
        })(),
      });
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'خطا در ذخیره تنظیمات در دیتابیس' } },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'خطای داخلی سرور' } },
      { status: 500 },
    );
  }
}
