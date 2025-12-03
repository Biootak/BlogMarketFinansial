import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { checkRateLimit } from '@/lib/rate-limiter';

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  // 1. HTTPS redirect در production
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  // 2. Rate limiting برای API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitType = pathname.includes('/upload')
      ? 'upload'
      : pathname.includes('/auth')
        ? 'auth'
        : pathname.includes('/pageview')
          ? 'pageview'
          : 'api';

    const { success, remaining, reset } = await checkRateLimit(ip, rateLimitType);

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: 'تعداد درخواست‌ها بیش از حد مجاز است',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  // 3. محافظت از dashboard
  if (pathname.startsWith('/dashboard')) {
    const session = await auth();

    if (!session?.user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // چک کردن دسترسی ادمین برای برخی صفحات
    const adminOnlyPaths = ['/dashboard/users', '/dashboard/settings', '/dashboard/system-logs'];
    const isAdminPath = adminOnlyPaths.some((p) => pathname.startsWith(p));

    if (isAdminPath) {
      const userRole = (session.user as any).role;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // 4. جلوگیری از دسترسی به فایل‌های حساس
  const sensitivePatterns = [/\.env/, /\.git/, /prisma\/.*\.prisma$/, /\.config\./];

  if (sensitivePatterns.some((pattern) => pattern.test(pathname))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 5. اضافه کردن security headers
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
