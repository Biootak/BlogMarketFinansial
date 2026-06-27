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

// 2026-06-14: precompile the route matchers once at module load.
// The previous implementation built a fresh `new RegExp` on every
// request, and ran it once per route. With 10+ admin routes and
// 10+ author routes, every request to /dashboard or /api was
// doing 20+ regex allocations + executions. The precompiled
// version is allocation-free on the hot path.
type CompiledRoute = { pattern: string; test: (pathname: string) => boolean };

const compileRoute = (pattern: string): CompiledRoute => {
  if (pattern.includes('[...')) {
    const base = pattern.split('/[...')[0];
    return {
      pattern,
      test: (p) => p === base || p.startsWith(base + '/'),
    };
  }
  if (pattern.includes('[[...')) {
    const base = pattern.split('/[[...')[0];
    return {
      pattern,
      test: (p) => p === base || p.startsWith(base + '/'),
    };
  }
  const regexPattern = pattern.replace(/\[.*?\]/g, '[^/]+').replace(/\//g, '\\/');
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  return { pattern, test: (p) => regex.test(p) };
};

const compiledBaseDashboard = baseDashboardRoutes.map(compileRoute);
const compiledSuperAdmin = superAdminRoutes.map(compileRoute);
const compiledAdmin = adminRoutes.map(compileRoute);
const compiledAuthor = authorRoutes.map(compileRoute);
const compiledPublic = publicRoutes.map(compileRoute);

const matchesAny = (pathname: string, routes: CompiledRoute[]): boolean =>
  routes.some((r) => r.test(pathname));

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

const isStaticPath = (pathname: string): boolean => {
  // 2026-06-14: matcher in `config` already excludes static assets
  // and the /api/public, /api/auth, /api/uploads, /api/pageview
  // prefixes, so this function is rarely called. The list is
  // tightened to keep the cost O(1) when it does run.
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/uploads/')) return true;
  if (pathname.startsWith('/api/uploads/')) return true;
  if (pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/manifest.json' || pathname === '/site.webmanifest') return true;
  if (pathname.includes('.')) return true;
  return false;
};

const isPublicApi = (pathname: string): boolean => {
  return pathname.startsWith('/api/public/') || pathname.startsWith('/api/debug');
};

const checkDashboardAccess = (pathname: string, role?: string) => {
  if (matchesAny(pathname, compiledBaseDashboard)) return true;
  if (role === 'SUPER_ADMIN' && matchesAny(pathname, compiledSuperAdmin)) return true;
  if (
    (role === 'ADMIN' || role === 'SUPER_ADMIN') &&
    matchesAny(pathname, compiledAdmin)
  )
    return true;
  if (
    ['AUTHOR', 'ADMIN', 'SUPER_ADMIN'].includes(role || '') &&
    matchesAny(pathname, compiledAuthor)
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
  if (matchesAny(pathname, compiledPublic)) return NextResponse.next();

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
  // 2026-06-14: tightened the matcher. The previous version was
  // a single negative-lookahead that ran the middleware for every
  // public-facing page, which meant decoding the JWT on every home,
  // archive, single, author, etc. request — even though the home
  // and archive pages don't need auth at all.
  //
  // New matcher: only paths that start with /dashboard, /api, or
  // /signin|/signup etc. (auth routes) get the middleware. Public
  // marketing pages skip the JWT decode entirely.
  //
  // Excludes: /api/pageview (hot path, has its own rate limit),
  // /api/public/* (no auth needed), /api/auth/* (NextAuth),
  // /api/uploads/* (file serving), /uploads/* (file rewrite),
  // /_next/* and files with extensions.
  matcher: [
    '/dashboard/:path*',
    '/api/((?!pageview|public|auth|uploads).*)',
    '/signin',
    '/signup',
    '/verify-request',
    '/forgot-password',
    '/reset-password',
  ],
};
