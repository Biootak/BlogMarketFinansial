import {
  adminRoutes,
  apiAuthPrefix,
  authRoutes,
  authorRoutes,
  baseDashboardRoutes,
  publicRoutes,
  superAdminRoutes,
  userFintechRoutes,
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

// نقش‌هایی که بعد از لاگین باید به /customer/dashboard بروند
const CUSTOMER_PORTAL_ROLES = new Set(['CUSTOMER', 'TEST_CUSTOMER', 'MERCHANT']);

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
const compiledUserFintech = userFintechRoutes.map(compileRoute);

const matchesAny = (pathname: string, routes: CompiledRoute[]): boolean =>
  routes.some((r) => r.test(pathname));

// SUPERADMIN is treated identically to OWNER at the platform level.
const SUPER_ROLES = new Set(['OWNER', 'SUPERADMIN']);
const ADMIN_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const AUTHOR_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR']);

const checkApiAccess = (pathname: string, role?: string): boolean => {
  if (pathname.startsWith('/api/public')) return true;
  if (pathname.startsWith(apiAuthPrefix)) return true;
  if (!role) return false;
  // OWNER + SUPERADMIN have unrestricted access
  if (SUPER_ROLES.has(role)) return true;
  if (ADMIN_ROLES.has(role) && adminApiRoutes.some((r) => pathname.startsWith(r))) return true;
  if (AUTHOR_ROLES.has(role) && authorApiRoutes.some((r) => pathname.startsWith(r))) return true;
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

// Roles that are NOT allowed in /dashboard (they belong to /exchange or /customer areas).
// R8-fix: CUSTOMER, MERCHANT, EXCHANGE, TEST_CUSTOMER have no business in the blog/admin dashboard.
// EXCHANGE → /exchange/dashboard | CUSTOMER/TEST_CUSTOMER/MERCHANT → /customer/dashboard
const DASHBOARD_BLOCKED_ROLES = new Set(['CUSTOMER', 'MERCHANT', 'EXCHANGE', 'TEST_CUSTOMER']);

// نقش‌هایی که بعد از لاگین باید به /exchange/dashboard بروند
const EXCHANGE_ROLES = new Set(['EXCHANGE']);

const checkDashboardAccess = (pathname: string, role?: string) => {
  // Block fintech-only roles from the entire /dashboard tree
  if (role && DASHBOARD_BLOCKED_ROLES.has(role)) return false;
  if (matchesAny(pathname, compiledBaseDashboard)) return true;
  // R13-fix (2026-07-29): userFintechRoutes (wallet/kyc/transfer/devices/notifications)
  // are customer-facing surfaces — accessible to ANY authenticated user (USER + staff).
  if (matchesAny(pathname, compiledUserFintech)) return true;
  // SUPERADMIN is an alias for OWNER — both get full superAdmin + admin + author routes
  if (role && SUPER_ROLES.has(role) && matchesAny(pathname, compiledSuperAdmin)) return true;
  if (role && ADMIN_ROLES.has(role) && matchesAny(pathname, compiledAdmin)) return true;
  if (role && AUTHOR_ROLES.has(role) && matchesAny(pathname, compiledAuthor)) return true;
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
    // 2026-07-29 (R13-fix): expired=1 اضافه می‌شود تا AuthFlow یک notice
    // «نشست منقضی شد» نشان دهد و کاربر صفحهٔ خالی نبیند.
    return NextResponse.redirect(
      new URL(`/auth?expired=1&callbackUrl=${encodeURIComponent(pathname)}`, nextUrl),
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
    // 2026-07-29 (R13-fix): unauthenticated=1 تا AuthFlow پیام بدهد
    return NextResponse.redirect(
      new URL(`/auth?unauthenticated=1&callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl),
    );
  }

  // Smart post-login redirect: بر اساس نقش → پورتال صحیح
  // این catch کاربرانی را می‌کند که DEFAULT_REDIRECT='/dashboard' آن‌ها را اینجا آورده
  if (isLoggedIn && pathname === '/dashboard' && role) {
    if (EXCHANGE_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/exchange/dashboard', nextUrl));
    }
    if (CUSTOMER_PORTAL_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/customer/dashboard', nextUrl));
    }
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
    // R8-fix: EXCHANGE → /exchange/dashboard | CUSTOMER → /customer/dashboard | بقیه → /
    if (role && EXCHANGE_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/exchange/dashboard', nextUrl));
    }
    if (role && CUSTOMER_PORTAL_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/customer/dashboard', nextUrl));
    }
    if (role && DASHBOARD_BLOCKED_ROLES.has(role)) {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // /exchange/* routes — require login + correct role.
  // The Exchange layout further verifies staff membership from DB.
  // Middleware check prevents unrelated roles (AUTHOR, USER, …) from
  // reaching the layout at all — faster rejection at the edge.
  if (pathname.startsWith('/exchange')) {
    if (!isLoggedIn) {
      const callbackUrl = pathname + search;
      return NextResponse.redirect(
        new URL(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl),
      );
    }
    // Allow: EXCHANGE staff + platform admins (OWNER/SUPERADMIN/ADMIN for oversight)
    const EXCHANGE_ALLOWED = new Set(['EXCHANGE', 'OWNER', 'SUPERADMIN', 'ADMIN']);
    if (role && !EXCHANGE_ALLOWED.has(role)) {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
  }

  // /customer/* routes — require login + correct role.
  // The Customer layout further verifies Customer record ownership from DB.
  // Middleware check prevents unrelated roles (AUTHOR, USER, EXCHANGE, …) from
  // reaching the layout at all — faster rejection at the edge.
  if (pathname.startsWith('/customer')) {
    if (!isLoggedIn) {
      const callbackUrl = pathname + search;
      return NextResponse.redirect(
        new URL(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl),
      );
    }
    // Allow: customer roles + platform admins (OWNER/SUPERADMIN/ADMIN for support)
    const CUSTOMER_ALLOWED = new Set([
      'CUSTOMER',
      'TEST_CUSTOMER',
      'MERCHANT',
      'OWNER',
      'SUPERADMIN',
      'ADMIN',
    ]);
    if (role && !CUSTOMER_ALLOWED.has(role)) {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  // 2026-06-14: tightened the matcher.
  // 2026-07-08 (C1 fix): /api/* routes self-enforce auth via their own `auth()` checks.
  // R12-fix (2026-07): /exchange/:path* added — Exchange Panel requires authentication.
  // /customer/:path* added — Customer Portal requires authentication.
  // The Exchange/Customer layouts handle membership verification beyond basic login.
  matcher: [
    '/dashboard/:path*',
    '/exchange/:path*',
    '/customer/:path*',
    '/auth',
    '/signin',
    '/signup',
    '/verify-request',
    '/forgot-password',
    '/reset-password',
  ],
};
