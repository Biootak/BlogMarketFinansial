import { auth } from '@/auth';
import { assertSameOrigin } from '@/lib/csrf';
import { deleteFile } from '@/lib/storage';
import { type NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  // M1 fix parity with /api/revalidate: reject cross-origin state-changing
  // requests so a logged-in admin can't be CSRF'd into deleting files.
  if (!assertSameOrigin(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'CSRF', message: 'درخواست نامعتبر' } },
      { status: 403 },
    );
  }

  try {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || (role !== 'ADMIN' && role !== 'OWNER')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'فقط ادمین می‌تواند فایل حذف کند' } },
        { status: 403 },
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_IMAGE_URL', message: 'آدرس تصویر الزامی است' } },
        { status: 400 },
      );
    }

    // فقط فایل‌های لوکال رو حذف کن
    if (!imageUrl.startsWith('/uploads/')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_IMAGE_URL', message: 'فقط فایل‌های آپلود شده قابل حذف هستند' },
        },
        { status: 400 },
      );
    }

    // استخراج folder و filename از URL
    const parts = imageUrl.replace('/uploads/', '').split('/');
    if (parts.length < 2 || parts.some((p: string) => p === '..' || p.includes('~'))) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PATH', message: 'مسیر نامعتبر' } },
        { status: 400 },
      );
    }

    const folder = parts[0];
    const ALLOWED_FOLDERS = ['posts', 'avatars', 'categories', 'tags', 'ads', 'general'];
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FOLDER', message: 'فولدر نامعتبر' } },
        { status: 400 },
      );
    }
    const filename = parts.slice(1).join('/');

    const deleted = await deleteFile(folder, filename);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_NOT_FOUND', message: 'فایل یافت نشد' } },
        { status: 404 },
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
      { status: 500 },
    );
  }
}
