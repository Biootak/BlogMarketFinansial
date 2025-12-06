import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // چک احراز هویت - فقط ادمین‌ها می‌تونن cache رو پاک کنن
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { path } = await request.json();

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'مسیر نامعتبر است' }, { status: 400 });
    }

    // محدود کردن مسیرهای مجاز
    const allowedPaths = ['/', '/blog', '/categories', '/tags', '/authors'];
    const isAllowed = allowedPaths.some((p) => path === p || path.startsWith(`${p}/`));

    if (!isAllowed && !path.startsWith('/dashboard')) {
      return NextResponse.json({ error: 'مسیر مجاز نیست' }, { status: 400 });
    }

    revalidatePath(path);
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    console.error('Revalidate error:', error);
    return NextResponse.json({ error: 'خطا در پاکسازی کش' }, { status: 500 });
  }
}
