import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import {
  apiAuthPrefix,
  publicRoutes,
  authRoutes,
  authorRoutes,
  adminRoutes,
  superAdminRoutes,
  baseDashboardRoutes,
} from './config/routes';

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
  '/api/dashboard/recent-drafts',
];

/**
 * چک کردن دسترسی به API
 */
const checkApiAccess = (pathname: string, role?: string): boolean => {
  if (pathname.startsWith('/api/public')) {
    return true;
  }

  if (pathname.startsWith(apiAuthPrefix)) {
    return true;
  }

  if (!role) {
    return false;
  }

  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (
    (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
    adminApiRoutes.some((route) => pathname.startsWith(route))
  ) {
    return true;
  }

  if (
    ['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(role) &&
    authorApiRoutes.some((route) => pathname.startsWith(route))
  ) {
    return true;
  }

  if (pathname.startsWith('/api/')) {
    return false;
  }

  return true;
};


/**
 * تابع کمکی برای تطبیق مسیرهای داینامیک
 */
const matchDynamicRoute = (pathname: string, pattern: string): boolean => {
  const regexPattern = pattern
    .replace(/\[\.\.\..*?\]/g, '.*')
    .replace(/\[.*?\]/g, '[^/]+')
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`, 'i');
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
  if (baseDashboardRoutes.some((route) => matchDynamicRoute(pathname, route))) {
    return true;
  }

  if (
    role === 'SUPER_ADMIN' &&
    superAdminRoutes.some((route) => matchDynamicRoute(pathname, route))
  ) {
    return true;
  }

  if (
    (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
    adminRoutes.some((route) => matchDynamicRoute(pathname, route))
  ) {
    return true;
  }

  if (
    ['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(role || '') &&
    authorRoutes.some((route) => matchDynamicRoute(pathname, route))
  ) {
    return true;
  }

  return false;
};

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const search = nextUrl.search;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (token?.exp && Date.now() / 1000 > token.exp) {
    return NextResponse.redirect(
      new URL(`/signin?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl),
    );
  }

  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  if (isPublicApi(pathname)) {
    return NextResponse.next();
  }

  if (publicRoutes.some((route) => matchDynamicRoute(pathname, route))) {
    return NextResponse.next();
  }

  if (authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    const callbackUrl = `${pathname}${search}`;
    return NextResponse.redirect(
      new URL(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl),
    );
  }

  if (pathname.startsWith('/api') && !isPublicApi(pathname)) {
    if (checkApiAccess(pathname, role)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (pathname.startsWith('/dashboard')) {
    if (checkDashboardAccess(pathname, role)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
