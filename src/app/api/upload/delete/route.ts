import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteFile } from '@/lib/storage';

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
        { error: 'فقط فایل‌های آپلود شده قابل حذف هستند' },
        { status: 400 }
      );
    }

    // استخراج folder و filename از URL
    const parts = imageUrl.replace('/uploads/', '').split('/');
    if (parts.length < 2) {
      return NextResponse.json({ error: 'مسیر نامعتبر' }, { status: 400 });
    }

    const folder = parts[0];
    const filename = parts.slice(1).join('/');

    const deleted = await deleteFile(folder, filename);

    if (!deleted) {
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'فایل با موفقیت حذف شد',
    });
  } catch (error) {
    console.error('خطا در حذف فایل:', error);
    return NextResponse.json({ error: 'خطا در حذف فایل' }, { status: 500 });
  }
}

