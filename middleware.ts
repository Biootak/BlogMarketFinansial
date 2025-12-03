import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

// Rate limiting storage (در production از Redis استفاده کن)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Clickjacking protection
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content Security Policy (تنظیم بر اساس نیاز)
  // response.headers.set(
  //   'Content-Security-Policy',
  //   "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  // );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate limiting برای API routes
  if (pathname.startsWith('/api/')) {
    const key = getRateLimitKey(request);
    const limit = pathname.includes('/upload') ? 30 : 100; // آپلود: 30/min, بقیه: 100/min
    const windowMs = 60 * 1000;

    if (!checkRateLimit(key, limit, windowMs)) {
      return new NextResponse(
        JSON.stringify({ error: 'تعداد درخواست‌ها بیش از حد مجاز است' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 2. محافظت از dashboard
  if (pathname.startsWith('/dashboard')) {
    const session = await auth();
    
    if (!session?.user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // چک کردن دسترسی ادمین برای برخی صفحات
    const adminOnlyPaths = ['/dashboard/users', '/dashboard/settings', '/dashboard/system-logs'];
    const isAdminPath = adminOnlyPaths.some(p => pathname.startsWith(p));
    
    if (isAdminPath) {
      const userRole = (session.user as any).role;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // 3. جلوگیری از دسترسی به فایل‌های حساس
  const sensitivePatterns = [
    /\.env/,
    /\.git/,
    /prisma\/.*\.prisma$/,
    /\.config\./,
  ];

  if (sensitivePatterns.some(pattern => pattern.test(pathname))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 4. اضافه کردن security headers
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
