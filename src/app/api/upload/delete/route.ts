import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteFile } from '@/lib/storage';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'احراز هویت الزامی است' } },
        { status: 401 }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_IMAGE_URL', message: 'آدرس تصویر الزامی است' } },
        { status: 400 }
      );
    }

    // فقط فایل‌های لوکال رو حذف کن
    if (!imageUrl.startsWith('/uploads/')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_IMAGE_URL', message: 'فقط فایل‌های آپلود شده قابل حذف هستند' },
        },
        { status: 400 }
      );
    }

    // استخراج folder و filename از URL
    const parts = imageUrl.replace('/uploads/', '').split('/');
    if (parts.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PATH', message: 'مسیر نامعتبر' } },
        { status: 400 }
      );
    }

    const folder = parts[0];
    const filename = parts.slice(1).join('/');

    const deleted = await deleteFile(folder, filename);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_NOT_FOUND', message: 'فایل یافت نشد' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'فایل با موفقیت حذف شد' },
    });
  } catch (error) {
    console.error('خطا در حذف فایل:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: 'خطا در حذف فایل' } },
      { status: 500 }
    );
  }
}

