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

const SECURE_COOKIE_NAME = '__Secure-authjs.session-token';
const DEV_COOKIE_NAME = 'authjs.session-token';
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const CUSTOMER_PORTAL_ROLES = new Set(['CUSTOMER', 'TEST_CUSTOMER', 'MERCHANT']);

const adminApiRoutes = ['/api/users', '/api/advertisements', '/api/exchange-rates', '/api/rate-lists', '/api/categories', '/api/credit-rates', '/api/billing', '/api/subscription', '/api/posts', '/api/system-stats'];
const authorApiRoutes = ['/api/posts', '/api/comments', '/api/categories', '/api/traffic-stats', '/api/dashboard/view-stats', '/api/dashboard/stats', '/api/dashboard/scheduled-posts', '/api/dashboard/popular-posts', '/api/dashboard/recent-drafts'];

type CompiledRoute = { pattern: string; test: (pathname: string) => boolean };
const compileRoute = (pattern: string): CompiledRoute => {
  if (pattern.includes('[...')) {
    const base = pattern.split('/[...')[0];
    return { pattern, test: (p) => p === base || p.startsWith(`${base}/`) };
  }
  if (pattern.includes('[[...')) {
    const base = pattern.split('/[[...')[0];
    return { pattern, test: (p) => p === base || p.startsWith(`${base}/`) };
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
const matchesAny = (pathname: string, routes: CompiledRoute[]): boolean => routes.some((r) => r.test(pathname));
const SUPER_ROLES = new Set(['OWNER', 'SUPERADMIN']);
const ADMIN_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const AUTHOR_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR']);
const SUPPORT_ROUTE_PREFIXES = ['/dashboard/helpdesk', '/dashboard/approvals', '/dashboard/service-requests'];

const checkApiAccess = (pathname: string, role?: string): boolean => {
  if (pathname.startsWith('/api/public')) return true;
  if (pathname.startsWith(apiAuthPrefix)) return true;
  if (!role) return false;
  if (SUPER_ROLES.has(role)) return true;
  if (ADMIN_ROLES.has(role) && adminApiRoutes.some((r) => pathname.startsWith(r))) return true;
  if (AUTHOR_ROUTES.has(role) && authorApiRoutes.some((r) => pathname.startsWith(r))) return true;
  if (pathname.startsWith('/api/')) return false;
  return true;
};

const isStaticPath = (pathname: string): boolean => {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/uploads/')) return true;
  if (pathname.startsWith('/api/uploads/')) return true;
  if (pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/manifest.json' || pathname === '/site.webmanifest') return true;
  if (pathname.includes('.')) return true;
  return false;
};

// Only explicitly public API namespaces bypass auth. Debug endpoints are never public.
const isPublicApi = (pathname: string): boolean => pathname.startsWith('/api/public/') || pathname.startsWith(apiAuthPrefix);
const DASHBOARD_BLOCKED_ROLES = new Set(['CUSTOMER', 'MERCHANT', 'EXCHANGE', 'TEST_CUSTOMER']);
const EXCHANGE_ROLES = new Set(['EXCHANGE']);

const checkDashboardAccess = (pathname: string, role?: string) => {
  if (role && DASHBOARD_BLOCKED_ROLES.has(role)) return false;
  if (matchesAny(pathname, compiledBaseDashboard)) return true;
  if (matchesAny(pathname, compiledUserFintech)) return true;
  if (role && SUPER_ROLES.has(role) && matchesAny(pathname, compiledSuperAdmin)) return true;
  if (role && ADMIN_ROLES.has(role) && matchesAny(pathname, compiledAdmin)) return true;
  if (role && AUTHOR_ROLES.has(role) && matchesAny(pathname, compiledAuthor)) return true;
  if (role === 'SUPPORT' && SUPPORT_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return false;
};

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const search = nextUrl.search;
  if (isStaticPath(pathname)) return NextResponse.next();
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieName = isProduction ? SECURE_COOKIE_NAME : DEV_COOKIE_NAME;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  if (DEBUG_MODE && pathname.startsWith('/dashboard')) {
    // Intentionally no sensitive request/session data is logged.
  }
  if (token?.exp && Date.now() / 1000 > token.exp) {
    if (pathname === '/auth' || pathname.startsWith('/auth?')) return NextResponse.next();
    return NextResponse.redirect(new URL(`/auth?expired=1&callbackUrl=${encodeURIComponent(pathname)}`, nextUrl));
  }
  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;
  if (isPublicApi(pathname)) return NextResponse.next();
  if (matchesAny(pathname, compiledPublic)) return NextResponse.next();
  if (authRoutes.some((r) => pathname.startsWith(r))) return NextResponse.next();
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    const callbackUrl = pathname + search;
    return NextResponse.redirect(new URL(`/auth?unauthenticated=1&callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl));
  }
  if (isLoggedIn && pathname === '/dashboard' && role) {
    if (EXCHANGE_ROLES.has(role)) return NextResponse.redirect(new URL('/exchange/dashboard', nextUrl));
    if (CUSTOMER_PORTAL_ROLES.has(role)) return NextResponse.redirect(new URL('/customer/dashboard', nextUrl));
  }
  if (pathname.startsWith('/api') && !isPublicApi(pathname)) {
    if (checkApiAccess(pathname, role)) return NextResponse.next();
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (pathname.startsWith('/dashboard')) {
    const hasAccess = checkDashboardAccess(pathname, role);
    if (hasAccess) return NextResponse.next();
    if (role && EXCHANGE_ROLES.has(role)) return NextResponse.redirect(new URL('/exchange/dashboard', nextUrl));
    if (role && CUSTOMER_PORTAL_ROLES.has(role)) return NextResponse.redirect(new URL('/customer/dashboard', nextUrl));
    if (role && DASHBOARD_BLOCKED_ROLES.has(role)) return NextResponse.redirect(new URL('/', nextUrl));
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }
  if (pathname === '/exchange' || pathname.startsWith('/exchange/')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL(`/auth?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl));
    const EXCHANGE_ALLOWED = new Set(['EXCHANGE', 'OWNER', 'SUPERADMIN', 'ADMIN']);
    if (role && !EXCHANGE_ALLOWED.has(role)) return NextResponse.redirect(new URL('/', nextUrl));
  }
  if (pathname === '/customer' || pathname.startsWith('/customer/')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL(`/auth?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl));
    const CUSTOMER_ALLOWED = new Set(['CUSTOMER', 'TEST_CUSTOMER', 'MERCHANT', 'USER', 'OWNER', 'SUPERADMIN', 'ADMIN']);
    if (role && !CUSTOMER_ALLOWED.has(role)) return NextResponse.redirect(new URL('/', nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/exchange/:path*', '/customer/:path*', '/auth', '/signin', '/signup', '/verify-request', '/verify-email', '/forgot-password', '/reset-password', '/error'],
};
