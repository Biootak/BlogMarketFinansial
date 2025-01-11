import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  DEFAULT_REDIRECT,
  apiAuthPrefix,
  publicRoutes,
  authRoutes,
  authorRoutes,
  postOwnershipRoutes,
  adminRoutes,
  superAdminRoutes,
  baseDashboardRoutes,
} from './config/routes';
import authConfig from './auth.config';
import { auth } from './auth';

/**
 * مسیرهای API که نیاز به دسترسی ادمین دارند
 */
const adminApiRoutes = [
  '/api/users',
  '/api/advertisements',
  '/api/exchange-rates',
  '/api/rate-lists',
  '/api/categories',
  '/api/credit-rates',
  '/api/billing',
  '/api/subscription',
  '/api/posts',
  '/api/system-stats',
];

/**
 * مسیرهای API که نیاز به دسترسی نویسنده دارند
 */
const authorApiRoutes = [
  '/api/posts',
  '/api/comments',
  '/api/categories',
  '/api/traffic-stats',
  '/api/dashboard/view-stats',
  '/api/dashboard/stats',
  '/api/dashboard/scheduled-posts',
  '/api/dashboard/popular-posts',
  '/api/dashboard/recent-drafts'
];

/**
 * چک کردن دسترسی به API
 */
const checkApiAccess = (pathname: string, role?: string): boolean => {
  // مسیرهای عمومی API
  if (pathname.startsWith('/api/public')) {
    return true;
  }

  // مسیرهای احراز هویت
  if (pathname.startsWith(apiAuthPrefix)) {
    return true;
  }

  if (!role) {
    return false;
  }

  // دسترسی سوپر ادمین
  if (role === 'SUPER_ADMIN') {
    return true;
  }

  // دسترسی ادمین
  if (
    (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
    adminApiRoutes.some((route) => pathname.startsWith(route))
  ) {
    return true;
  }

  // دسترسی نویسنده
  if (
    ['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(role) &&
    authorApiRoutes.some((route) => pathname.startsWith(route))
  ) {
    return true;
  }

  // اگر مسیر API باشد و به اینجا برسیم، یعنی دسترسی ندارد
  if (pathname.startsWith('/api/')) {
    return false;
  }

  // برای مسیرهای غیر API، دسترسی می‌دهیم
  return true;
};

/**
 * تابع کمکی برای تطبیق مسیرهای داینامیک
 */
const matchDynamicRoute = (pathname: string, pattern: string): boolean => {
  // تبدیل الگو به یک عبارت منظم
  const regexPattern = pattern
    .replace(/\[\.\.\..*?\]/g, '.*') // برای [...slug]
    .replace(/\[.*?\]/g, '[^/]+') // برای [id]
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`, 'i'); // اضافه کردن i برای case-insensitive
  return regex.test(pathname);
};

/**
 * تابع کمکی برای تطبیق مسیرهای استاتیک
 */
const isStaticPath = (pathname: string): boolean => {
  const staticPatterns = [
    '/images/',
    '/_next/',
    '/assets/',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/site.webmanifest',
  ];
  return staticPatterns.some((pattern) => pathname.startsWith(pattern));
};

/**
 * تابع کمکی برای تشخیص API های عمومی
 */
const isPublicApi = (pathname: string): boolean => {
  return pathname.startsWith('/api/public/');
};

/**
 * چک کردن دسترسی به داشبورد
 */
const checkDashboardAccess = (pathname: string, role?: string) => {
  // دسترسی به مسیرهای پایه داشبورد
  if (baseDashboardRoutes.some((route) => matchDynamicRoute(pathname, route))) {
    return true;
  }

  // دسترسی سوپر ادمین
  if (
    role === 'SUPER_ADMIN' &&
    superAdminRoutes.some((route) => matchDynamicRoute(pathname, route))
  ) {
    return true;
  }

  // دسترسی ادمین
  if (
    (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
    adminRoutes.some((route) => matchDynamicRoute(pathname, route))
  ) {
    return true;
  }

  // دسترسی نویسنده
  if (
    ['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(role || '') &&
    authorRoutes.some((route) => matchDynamicRoute(pathname, route))
  ) {
    return true;
  }

  return false;
};

export default auth(async (req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const search = nextUrl.search;

  // بررسی session و دریافت اطلاعات کاربر
  const session = await auth();
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  // بررسی توکن منقضی شده
  if (token?.exp && Date.now() / 1000 > token.exp) {
    return NextResponse.redirect(
      new URL(`/signin?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl),
    );
  }

  const isLoggedIn = !!session;
  const role = session?.user?.role as string;
  const userId = session?.user?.id;

  // اجازه دسترسی به فایل‌های استاتیک
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  // اجازه دسترسی به API های عمومی
  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // اجازه دسترسی به مسیرهای عمومی
  if (publicRoutes.some((route) => matchDynamicRoute(pathname, route))) {
    return NextResponse.next();
  }

  // اجازه دسترسی به مسیرهای احراز هویت
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // بررسی لاگین برای مسیرهای محافظت شده
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    const callbackUrl = `${pathname}${search}`;
    return NextResponse.redirect(
      new URL(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl),
    );
  }

  // بررسی دسترسی به API های محافظت شده
  if (pathname.startsWith('/api') && !isPublicApi(pathname)) {
    if (checkApiAccess(pathname, role)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // بررسی دسترسی به داشبورد
  if (pathname.startsWith('/dashboard')) {
    if (checkDashboardAccess(pathname, role)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
