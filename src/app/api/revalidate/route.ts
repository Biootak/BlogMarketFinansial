import { auth } from '@/auth';
import { getTrustedClientIp } from '@/lib/client-ip';
import { assertSameOrigin } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { Role } from '@prisma/client';
import { revalidatePath } from '@/lib/revalidate';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // M1 fix: CSRF — reject cross-origin state-changing requests.
    if (!assertSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: { code: 'CSRF', message: 'درخواست نامعتبر' } },
        { status: 403 },
      );
    }

    // چک احراز هویت - فقط ادمین‌ها می‌تونن cache رو پاک کنن
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت الزامی است' } },
        { status: 401 },
      );
    }

    const userRole = session.user.role as Role | undefined;
    if (userRole !== Role.ADMIN && userRole !== Role.OWNER) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
        { status: 403 },
      );
    }

    // M1 fix: rate-limit revalidation to prevent a loop from hammering the DB/upstream.
    const ip = getTrustedClientIp(request);
    const rl = await checkRateLimit(`revalidate:${ip}`, 'api');
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'RATE_LIMITED', message: 'تعداد درخواست بیش از حد مجاز است' },
        },
        { status: 429 },
      );
    }

    const { path } = await request.json();

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'مسیر نامعتبر است' } },
        { status: 400 },
      );
    }

    // محدود کردن مسیرهای مجاز
    const allowedPaths = ['/', '/blog', '/categories', '/tags', '/authors'];
    const isAllowed = allowedPaths.some((p) => path === p || path.startsWith(`${p}/`));

    if (!isAllowed && !path.startsWith('/dashboard')) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'مسیر مجاز نیست' } },
        { status: 400 },
      );
    }

    revalidatePath(path);
    return NextResponse.json({ success: true, data: { revalidated: true, now: Date.now() } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'خطا در پاکسازی کش' } },
      { status: 500 },
    );
  }
}
