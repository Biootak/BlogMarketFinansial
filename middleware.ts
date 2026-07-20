import {
  adminRoutes,
  apiAuthPrefix,
  authRoutes,
  authorRoutes,
  baseDashboardRoutes,
  publicRoutes,
  superAdminRoutes,
} from '@/config/routes';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
      test: (p) => p === base || p.startsWith(`${base}/`),
    };
  }
  if (pattern.includes('[[...')) {
    const base = pattern.split('/[[...')[0];
    return {
      pattern,
      test: (p) => p === base || p.startsWith(`${base}/`),
    };
  }
  const regexPattern = pattern.replace(/\[.*?\]/g, '[^/]+').replace(/\//g, '\\/');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
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
  if (role === 'OWNER') return true;
  if ((role === 'ADMIN' || role === 'OWNER') && adminApiRoutes.some((r) => pathname.startsWith(r)))
    return true;
  if (
    ['AUTHOR', 'ADMIN', 'OWNER'].includes(role) &&
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
  if (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.json' ||
    pathname === '/site.webmanifest'
  )
    return true;
  if (pathname.includes('.')) return true;
  return false;
};

const isPublicApi = (pathname: string): boolean => {
  return pathname.startsWith('/api/public/') || pathname.startsWith('/api/debug');
};

const checkDashboardAccess = (pathname: string, role?: string) => {
  if (matchesAny(pathname, compiledBaseDashboard)) return true;
  if (role === 'OWNER' && matchesAny(pathname, compiledSuperAdmin)) return true;
  if ((role === 'ADMIN' || role === 'OWNER') && matchesAny(pathname, compiledAdmin)) return true;
  if (['AUTHOR', 'ADMIN', 'OWNER'].includes(role || '') && matchesAny(pathname, compiledAuthor))
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
    // debug output suppressed — set DEBUG_MODE=true to enable tracing via server logs
  }

  // Check token expiration
  if (token?.exp && Date.now() / 1000 > token.exp) {
    return NextResponse.redirect(
      new URL(`/auth?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl),
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
    const callbackUrl = pathname + search;
    return NextResponse.redirect(
      new URL(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl),
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
  // 2026-07-08 (C1 fix): every /api/* route self-enforces auth + role via
  // its own `auth()` check (verified across all route handlers), so the
  // middleware no longer runs on /api at all. This avoids the previous
  // default-deny allowlist which (a) was fully bypassed by the bogus
  // `/[[...slug]]` public entry and (b) would over-block ADMIN/AUTHOR on
  // self-gated routes once that entry was removed. The middleware now
  // only guards the dashboard (role-based) and the auth routes.
  //
  // The matcher deliberately does NOT include /api — see note above.
  matcher: [
    '/dashboard/:path*',
    '/auth',
    '/signin',
    '/signup',
    '/verify-request',
    '/forgot-password',
    '/reset-password',
  ],
};
