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

import { isMaintenanceActive } from '@/lib/edge-maintenance';

const SECURE_COOKIE_NAME = '__Secure-authjs.session-token';
const DEV_COOKIE_NAME = 'authjs.session-token';
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const CUSTOMER_PORTAL_ROLES = new Set(['CUSTOMER', 'TEST_CUSTOMER', 'MERCHANT']);

/* ─────────────────────── سیاست دسترسی API ───────────────────────
 *
 * ۲۰۲۶-۰۸-۰۷ — چرا این بخش بازنویسی شد:
 *
 * نسخهٔ قبلی `checkApiAccess` با دو فهرست `adminApiRoutes` و
 * `authorApiRoutes` داشت، ولی `config.matcher` **هیچ ورودی `/api` نداشت**.
 * یعنی آن کد هرگز اجرا نمی‌شد — یک RBAC کاملاً مرده. بدتر: هر دو فهرست به
 * مسیرهایی اشاره می‌کردند که اصلاً وجود ندارند (`/api/users`,
 * `/api/system-stats`, `/api/dashboard/*`, …).
 *
 * حالا matcher عمداً **فقط APIهای مدیریتی** را می‌گیرد، نه کل `/api/*`.
 * دلیلش محافظه‌کاری است: باز کردن گارد روی همهٔ APIها یعنی ریسک شکستن
 * مسیرهای عمومی سایت (نرخ ارز، تبلیغ هدر، حواله) و پورتال مشتری، بدون
 * اینکه چیزی به امنیت اضافه کند — آن مسیرها یا عمومی‌اند یا گارد خودشان
 * را دارند. اینجا لایهٔ دوم دفاع برای همان‌هایی گذاشته می‌شود که اگر لو
 * بروند واقعاً درد دارد.
 * ───────────────────────────────────────────────────────────────── */

/** APIهایی که هرگز نباید پشت گاردِ نشست بروند: وب‌هوک، پروب، دارایی عمومی. */
const OPEN_API_PREFIXES = [
  '/api/auth',
  '/api/public',
  '/api/pageview',
  '/api/uploads',
  '/api/cron',
  '/api/telegram',
  '/api/health',
];

/** APIهای مدیریتی — فقط OWNER / SUPERADMIN / ADMIN. */
const ADMIN_API_PREFIXES = [
  '/api/observability',
  '/api/system-health',
  '/api/system-logs',
  '/api/system-status',
  '/api/system-reports',
  '/api/activity-log',
  '/api/traffic-stats',
  '/api/reports',
  '/api/jobs',
  '/api/approvals',
  '/api/communication',
  '/api/backup',
  '/api/settings',
  '/api/debug-rates',
];

/** ابزار توسعه — در production اصلاً نباید وجود داشته باشد. */
const DEV_ONLY_API_PREFIXES = ['/api/dev', '/api/debug-session'];

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
const matchesAny = (pathname: string, routes: CompiledRoute[]): boolean =>
  routes.some((r) => r.test(pathname));

/** تطبیق پیشوندی امن — `/api/jobsomething` نباید با `/api/jobs` مچ شود. */
const underPrefix = (pathname: string, prefixes: readonly string[]): boolean =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const SUPER_ROLES = new Set(['OWNER', 'SUPERADMIN']);
const ADMIN_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const AUTHOR_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR']);
const SUPPORT_ROUTE_PREFIXES = [
  '/dashboard/helpdesk',
  '/dashboard/approvals',
  '/dashboard/service-requests',
];

const jsonError = (status: number, code: string, message: string): NextResponse =>
  NextResponse.json(
    { success: false, error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  );

const isStaticPath = (pathname: string): boolean => {
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
  // 2026-08-09 fix: previously `pathname.includes('.')` let ANY dotted path
  // skip the guard — a crafted route containing a dot would bypass auth.
  // Now only real file extensions (webp, json, …) count as static.
  if (/\.[a-z0-9]+$/i.test(pathname)) return true;
  return false;
};
const isPublicApi = (pathname: string): boolean =>
  underPrefix(pathname, OPEN_API_PREFIXES) || pathname.startsWith(apiAuthPrefix);
const DASHBOARD_BLOCKED_ROLES = new Set(['CUSTOMER', 'MERCHANT', 'EXCHANGE', 'TEST_CUSTOMER']);
const EXCHANGE_ROLES = new Set(['EXCHANGE']);
const checkDashboardAccess = (pathname: string, role?: string) => {
  if (role && DASHBOARD_BLOCKED_ROLES.has(role)) return false;
  if (matchesAny(pathname, compiledBaseDashboard)) return true;
  if (matchesAny(pathname, compiledUserFintech)) return true;
  if (role && SUPER_ROLES.has(role) && matchesAny(pathname, compiledSuperAdmin)) return true;
  if (role && ADMIN_ROLES.has(role) && matchesAny(pathname, compiledAdmin)) return true;
  if (role && AUTHOR_ROLES.has(role) && matchesAny(pathname, compiledAuthor)) return true;
  if (
    role === 'SUPPORT' &&
    SUPPORT_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
    return true;
  return false;
};

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const search = nextUrl.search;
  if (isStaticPath(pathname)) return NextResponse.next();

  // ── Maintenance gate (site-wide): if active, ALL routes except cron and
  //    the maintenance page itself redirect there. The flag is shared via
  //    Upstash Redis (edge-safe) written by the settings toggle action.
  //    Graceful degradation: if Redis is down, the site stays up.
  //    Note: this check runs on EVERY matched route (':path*' matcher below)
  //    but is a single lightweight Redis GET when maintenance is inactive.
  if (await isMaintenanceActive()) {
    if (pathname === '/maintenance' || underPrefix(pathname, ['/api/cron'] as const)) {
      // Allow the maintenance page and cron webhooks without auth
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/maintenance', nextUrl));
  }
  const isProduction = process.env.NODE_ENV === 'production';
  const isApi = pathname.startsWith('/api/');
  // 2026-08-09 fix: Auth.js decides the secure (`__Secure-`) cookie prefix from
  // the auth base URL protocol (see @auth/core init.js: defaultCookies(
  // useSecureCookies ?? url.protocol === 'https:')). The middleware used to
  // decide it from NODE_ENV alone, so with NEXTAUTH_URL=https://… in a dev
  // server, Auth.js wrote `__Secure-authjs.session-token` while this guard
  // looked for `authjs.session-token` — every session was rejected and users
  // bounced back to /auth right after a successful login. Mirror Auth.js here.
  const authBaseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? '';
  const useSecureCookies = isProduction || authBaseUrl.startsWith('https://');
  const cookieName = useSecureCookies ? SECURE_COOKIE_NAME : DEV_COOKIE_NAME;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  if (DEBUG_MODE && pathname.startsWith('/dashboard')) {
    /* no sensitive logging */
  }
  if (token?.exp && Date.now() / 1000 > token.exp) {
    // مسیر API نباید redirect بگیرد — کلاینت fetch منتظر JSON است و یک
    // ریدایرکت به صفحهٔ HTML ورود باعث خطای parse می‌شود نه پیام روشن.
    if (isApi) return jsonError(401, 'SESSION_EXPIRED', 'نشست شما منقضی شده است');
    if (pathname === '/auth' || pathname.startsWith('/auth?')) return NextResponse.next();
    return NextResponse.redirect(
      new URL(`/auth?expired=1&callbackUrl=${encodeURIComponent(pathname)}`, nextUrl),
    );
  }
  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  /* ── APIها: قبل از هر قاعدهٔ صفحه‌ای ─────────────────────── */
  if (isApi) {
    if (underPrefix(pathname, DEV_ONLY_API_PREFIXES)) {
      // ابزار توسعه در production وجود ندارد — نه ۴۰۳، بلکه ۴۰۴، تا سطح
      // حمله را حتی افشا هم نکنیم.
      if (isProduction) return jsonError(404, 'NOT_FOUND', 'یافت نشد');
      if (!isLoggedIn) return jsonError(401, 'UNAUTHENTICATED', 'احراز هویت لازم است');
      return NextResponse.next();
    }
    if (isPublicApi(pathname)) return NextResponse.next();
    if (!isLoggedIn) return jsonError(401, 'UNAUTHENTICATED', 'احراز هویت لازم است');
    if (underPrefix(pathname, ADMIN_API_PREFIXES) && !ADMIN_ROLES.has(role ?? '')) {
      return jsonError(403, 'FORBIDDEN', 'دسترسی ندارید');
    }
    return NextResponse.next();
  }

  if (matchesAny(pathname, compiledPublic)) return NextResponse.next();
  if (authRoutes.some((r) => pathname.startsWith(r))) return NextResponse.next();
  if (!isLoggedIn && pathname.startsWith('/dashboard')) {
    const callbackUrl = pathname + search;
    return NextResponse.redirect(
      new URL(`/auth?unauthenticated=1&callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl),
    );
  }
  if (isLoggedIn && pathname === '/dashboard' && role) {
    if (EXCHANGE_ROLES.has(role))
      return NextResponse.redirect(new URL('/exchange/dashboard', nextUrl));
    if (CUSTOMER_PORTAL_ROLES.has(role))
      return NextResponse.redirect(new URL('/customer/dashboard', nextUrl));
  }
  if (pathname.startsWith('/dashboard')) {
    if (checkDashboardAccess(pathname, role)) return NextResponse.next();
    if (role && EXCHANGE_ROLES.has(role))
      return NextResponse.redirect(new URL('/exchange/dashboard', nextUrl));
    if (role && CUSTOMER_PORTAL_ROLES.has(role))
      return NextResponse.redirect(new URL('/customer/dashboard', nextUrl));
    if (role && DASHBOARD_BLOCKED_ROLES.has(role))
      return NextResponse.redirect(new URL('/', nextUrl));
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }
  if (pathname === '/exchange' || pathname.startsWith('/exchange/')) {
    if (!isLoggedIn)
      return NextResponse.redirect(
        new URL(`/auth?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl),
      );
    if (role && !new Set(['EXCHANGE', 'OWNER', 'SUPERADMIN', 'ADMIN']).has(role))
      return NextResponse.redirect(new URL('/', nextUrl));
  }
  if (pathname === '/customer' || pathname.startsWith('/customer/')) {
    if (!isLoggedIn)
      return NextResponse.redirect(
        new URL(`/auth?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl),
      );
    if (
      role &&
      !new Set([
        'CUSTOMER',
        'TEST_CUSTOMER',
        'MERCHANT',
        'USER',
        'OWNER',
        'SUPERADMIN',
        'ADMIN',
      ]).has(role)
    )
      return NextResponse.redirect(new URL('/', nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // `/:path*` برای site-wide maintenance gate (فقط یک Redis GET در حالت
    // عادی). ۲۰۲۶-۰۸-۰۹: قبلاً فقط مسیرهای خاص برای کارایی middleware
    // محدود شده بود، ولی maintenance mode نیاز دارد همهٔ مسیرها را ببندد.
    // هزینه: یک بررسی ۵-۱۰ میلی‌ثانیه‌ای روی هر درخواست.
    '/((?!_next/static|_next/image|favicon|robots|manifest|site.webmanifest).*)',
  ],
};
