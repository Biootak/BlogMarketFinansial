import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'آدرس تصویر الزامی است' }, { status: 400 });
    }

    // فقط فایل‌های لوکال رو حذف کن
    if (!imageUrl.startsWith('/uploads/')) {
      return NextResponse.json(
        { error: 'فقط فایل‌های لوکال قابل حذف هستند' },
        { status: 400 }
      );
    }

    const filepath = path.join(process.cwd(), 'public', imageUrl);

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    await unlink(filepath);

    return NextResponse.json({
      success: true,
      message: 'فایل با موفقیت حذف شد',
    });
  } catch (error) {
    console.error('خطا در حذف فایل:', error);
    return NextResponse.json({ error: 'خطا در حذف فایل' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
