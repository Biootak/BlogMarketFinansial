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
} from '@/config/routes';

// Cookie name for secure environments (production)
const SECURE_COOKIE_NAME = '__Secure-authjs.session-token';
const DEV_COOKIE_NAME = 'authjs.session-token';

// Debug mode - controlled via environment variable
// Set DEBUG_MODE=true in Vercel Environment Variables to enable
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

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

const checkApiAccess = (pathname: string, role?: string): boolean => {
  if (pathname.startsWith('/api/public')) return true;
  if (pathname.startsWith(apiAuthPrefix)) return true;
  if (!role) return false;
  if (role === 'SUPER_ADMIN') return true;
  if (
    (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
    adminApiRoutes.some((r) => pathname.startsWith(r))
  )
    return true;
  if (
    ['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(role) &&
    authorApiRoutes.some((r) => pathname.startsWith(r))
  )
    return true;
  if (pathname.startsWith('/api/')) return false;
  return true;
};

const matchDynamicRoute = (pathname: string, pattern: string): boolean => {
  // Handle catch-all routes [...slug]
  if (pattern.includes('[...')) {
    const basePattern = pattern.split('/[...')[0];
    return pathname === basePattern || pathname.startsWith(basePattern + '/');
  }

  // Handle optional catch-all [[...slug]]
  if (pattern.includes('[[...')) {
    const basePattern = pattern.split('/[[...')[0];
    return pathname === basePattern || pathname.startsWith(basePattern + '/');
  }

  // Handle single dynamic segments [id]
  const regexPattern = pattern.replace(/\[.*?\]/g, '[^/]+').replace(/\//g, '\\/');
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  return regex.test(pathname);
};

const isStaticPath = (pathname: string): boolean => {
  const staticPatterns = [
    '/images/',
    '/uploads/',
    '/_next/',
    '/assets/',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/site.webmanifest',
  ];
  return staticPatterns.some((p) => pathname.startsWith(p));
};

const isPublicApi = (pathname: string): boolean => {
  return pathname.startsWith('/api/public/') || pathname.startsWith('/api/debug');
};

const checkDashboardAccess = (pathname: string, role?: string) => {
  if (baseDashboardRoutes.some((r) => matchDynamicRoute(pathname, r))) return true;
  if (role === 'SUPER_ADMIN' && superAdminRoutes.some((r) => matchDynamicRoute(pathname, r)))
    return true;
  if (
    (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
    adminRoutes.some((r) => matchDynamicRoute(pathname, r))
  )
    return true;
  if (
    ['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(role || '') &&
    authorRoutes.some((r) => matchDynamicRoute(pathname, r))
  )
    return true;
  return false;
};

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const search = nextUrl.search;

  // Skip static paths early
  if (isStaticPath(pathname)) return NextResponse.next();

  // Use correct cookie name based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieName = isProduction ? SECURE_COOKIE_NAME : DEV_COOKIE_NAME;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName,
  });

  // Debug logging for dashboard routes
  if (DEBUG_MODE && pathname.startsWith('/dashboard')) {
    console.log('[Middleware Debug]', {
      pathname,
      isProduction,
      cookieName,
      hasToken: !!token,
      tokenRole: token?.role,
      hasSecret: !!process.env.AUTH_SECRET,
    });
  }

  // Check token expiration
  if (token?.exp && Date.now() / 1000 > token.exp) {
    if (DEBUG_MODE) console.log('[Middleware] Token expired, redirecting to signin');
    return NextResponse.redirect(
      new URL('/signin?callbackUrl=' + encodeURIComponent(pathname), nextUrl)
    );
  }

  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  // Public API routes
  if (isPublicApi(pathname)) return NextResponse.next();

  // Public routes
  if (publicRoutes.some((r) => matchDynamicRoute(pathname, r))) return NextResponse.next();

  // Auth routes (signin, signup, etc.)
  if (authRoutes.some((r) => pathname.startsWith(r))) return NextResponse.next();

  // Dashboard routes - require login
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    if (DEBUG_MODE) console.log('[Middleware] Not logged in, redirecting to signin');
    const callbackUrl = pathname + search;
    return NextResponse.redirect(
      new URL('/signin?callbackUrl=' + encodeURIComponent(callbackUrl), nextUrl)
    );
  }

  // API routes - check access
  if (pathname.startsWith('/api') && !isPublicApi(pathname)) {
    if (checkApiAccess(pathname, role)) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Dashboard routes - check role access
  if (pathname.startsWith('/dashboard')) {
    const hasAccess = checkDashboardAccess(pathname, role);
    if (DEBUG_MODE) console.log('[Middleware] Dashboard access check:', { pathname, role, hasAccess });
    if (hasAccess) return NextResponse.next();
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
