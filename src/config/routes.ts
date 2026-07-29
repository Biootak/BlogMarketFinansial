/**
 * Public routes that are accessible without authentication
 * @type {string[]}
 */
export const publicRoutes = [
  // صفحات اصلی
  '/',
  '/about',
  '/about/[...slug]',
  '/contact',
  '/contact/[...slug]',

  // صفحات قانونی و اطلاعات
  '/terms',
  '/privacy-policy',
  '/faq',
  '/404',
  '/support',
  '/help-center',
  '/feedback',

  // نقشه سایت و SEO
  '/sitemap.xml',
  '/sitemap',
  '/rss.xml',
  '/feed.json',

  // جستجو و آرشیو
  '/search',
  '/search/[...slug]',
  '/archive',
  '/archive/[[...slug]]',
  '/archive/category/[...slug]',
  '/archive/tag/[...slug]',
  '/archive/author/[...slug]',

  // بلاگ و پست‌ها
  '/blog',
  '/blog/[...slug]',
  '/posts',
  '/posts/[id]',
  '/posts/[...slug]',

  // دسته‌بندی‌ها و زیردسته‌ها
  '/categories',
  '/categories/[slug]',
  '/categories/[parent]/[child]',
  '/categories/[parent]/[child]/[grandchild]',
  '/categories/featured',
  '/categories/popular',
  '/categories/latest',

  // دسته‌بندی‌های مالی
  '/categories/financial',
  '/categories/financial/stocks',
  '/categories/financial/crypto',
  '/categories/financial/forex',
  '/categories/financial/commodities',

  // دسته‌بندی‌های بازار
  '/categories/market',
  '/categories/market/analysis',
  '/categories/market/news',
  '/categories/market/predictions',
  '/categories/market/strategies',

  // دسته‌بندی‌های آموزشی
  '/categories/education',
  '/categories/education/beginners',
  '/categories/education/advanced',
  '/categories/education/expert',
  '/categories/education/tutorials',

  // پست‌های دسته‌بندی شده
  '/posts/category/[category]',
  '/posts/category/[category]/[subcategory]',
  '/posts/category/[category]/[subcategory]/[post]',

  // برچسب‌ها
  '/tags',
  '/tags/[slug]',
  '/authors',
  '/authors/[username]',

  // نرخ‌ها و اطلاعات مالی
  '/exchange-rates',
  '/exchange-rates/[currency]',
  '/credit-rates',
  '/credit-rates/[bank]',
  '/market-analysis',
  '/market-analysis/[...slug]',
  '/financial-news',
  '/financial-news/[...slug]',

  // API های عمومی
  '/api/public',
  '/api/public/posts',
  '/api/public/posts/[id]',
  '/api/public/categories',
  '/api/public/tags',
  '/api/public/exchange-rates',
  '/api/public/credit-rates',
  '/api/public/market-stats',
  '/api/public/financial-news',

  // صفحات سرویس
  '/subscription',
  '/subscription/[plan]',
  '/services',
  '/services/compare',
  '/money-transfer',
  '/money-transfer/[...slug]',
  // R15-fix: صفحه ثبت‌نام صرافی — صفحه اصلی public است؛ auth درون page.tsx با redirect مدیریت می‌شود
  '/apply-exchange',
  '/apply-exchange/success',
  '/online-payment',
  '/online-payment/[...slug]',

  // فایل‌های استاتیک
  '/images',
  '/images/[...path]',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.json',
  '/site.webmanifest',
  '/_next/static',
  '/_next/image',
  '/assets',
  '/assets/[...path]',
  '/_not-found',
];

/**
 * Routes related to authentication
 * @type {string[]}
 *
 * 2026-06-23: /auth is the canonical entry — /signin, /signup, and
 * /forgot-password now redirect there. /verify-request is kept for
 * Auth.js's internal redirect target and standalone errors.
 */
export const authRoutes = [
  '/auth',
  '/signin',
  '/signup',
  '/forgot-password',
  '/error',
  '/verify-request',
  '/verify-email',
  '/reset-password',
];

/**
 * API prefix for authentication routes
 * @type {string}
 */
export const apiAuthPrefix = '/api/auth';

/**
 * Default redirect path after login
 * @type {string}
 */
export const DEFAULT_REDIRECT = '/dashboard';

/**
 * Base dashboard routes accessible by all authenticated users
 * @type {string[]}
 */
export const baseDashboardRoutes = [
  '/dashboard',
  '/dashboard/edit-profile',
  // A5-fix: معاملات ارزی کاربر — قابل دسترسی برای همه کاربران لاگین‌شده
  '/dashboard/my-deals',
  '/dashboard/my-deals/[...slug]',
  // موجود — درخواست‌های بلاگ/سرویس
  '/dashboard/my-requests',
  '/dashboard/my-requests/[...slug]',
];

/**
 * Fintech routes accessible to USER + OWNER/SUPERADMIN/ADMIN/AUTHOR
 * These are customer-facing fintech surfaces (wallet, KYC, transfer, devices,
 * notifications). USER uses them to operate the platform — not admin tools.
 * Pages enforce their own data-scoping (e.g. wallet shows only own accounts).
 * @type {string[]}
 */
export const userFintechRoutes = [
  '/dashboard/wallet',
  '/dashboard/wallet/[...slug]',
  '/dashboard/kyc',
  '/dashboard/kyc/[...slug]',
  '/dashboard/transfer',
  '/dashboard/transfer/[...slug]',
  '/dashboard/virtual-cards',
  '/dashboard/virtual-cards/[...slug]',
  '/dashboard/devices',
  '/dashboard/devices/[...slug]',
  '/dashboard/notifications',
  '/dashboard/notifications/[...slug]',
];

/**
 * Routes that require author access
 * @type {string[]}
 */
export const authorRoutes = [
  '/dashboard/posts',
  '/dashboard/posts/[...slug]',
  '/dashboard/categories',
  '/dashboard/categories/[...slug]',
  '/dashboard/edit-profile',
];

/**
 * Routes that require admin access (ADMIN)
 * @type {string[]}
 */
export const adminRoutes = [
  '/dashboard/users',
  '/dashboard/users/[...slug]',
  '/dashboard/roles',
  '/dashboard/roles/[...slug]',
  '/dashboard/advertisements',
  '/dashboard/advertisements/[...slug]',
  '/dashboard/exchange-rates',
  '/dashboard/exchange-rates/[...slug]',
  '/dashboard/rate-lists',
  '/dashboard/rate-lists/[...slug]',
  '/dashboard/categories',
  '/dashboard/categories/[...slug]',
  '/dashboard/credit-rates',
  '/dashboard/credit-rates/[...slug]',
  '/dashboard/billing-address',
  '/dashboard/billing-address/[...slug]',
  '/dashboard/subscription',
  '/dashboard/subscription/[...slug]',
  '/dashboard/posts',
  '/dashboard/posts/[...slug]',
  '/dashboard/service-requests',
  '/dashboard/service-requests/[...slug]',
  '/dashboard/test-page',
];

/**
 * Routes that only OWNER can access
 * @type {string[]}
 */
export const superAdminRoutes = [
  '/dashboard/settings',
  '/dashboard/settings/[...slug]',
  '/dashboard/reports',
  '/dashboard/reports/[...slug]',
  '/dashboard/permissions',
  '/dashboard/permissions/[...slug]',
  '/dashboard/audit-log',
  '/dashboard/audit-log/[...slug]',
  '/dashboard/kyc-review',
  '/dashboard/kyc-review/[...slug]',
  '/dashboard/fraud-review',
  '/dashboard/fraud-review/[...slug]',
  '/dashboard/settlements',
  '/dashboard/settlements/[...slug]',
  '/dashboard/wallet',
  '/dashboard/wallet/[...slug]',
  '/dashboard/header-ad',
  '/dashboard/header-ad/[...slug]',
  '/dashboard/devices',
  '/dashboard/devices/[...slug]',
  '/dashboard/notifications',
  '/dashboard/notifications/[...slug]',
  '/dashboard/kyc',
  '/dashboard/kyc/[...slug]',
  '/dashboard/transfer',
  '/dashboard/transfer/[...slug]',
  '/dashboard/subscription',
  '/dashboard/subscription/[...slug]',
  '/dashboard/virtual-cards',
  '/dashboard/virtual-cards/[...slug]',
  '/dashboard/rate-lists',
  '/dashboard/rate-lists/[...slug]',
  '/dashboard/exchanges',
  '/dashboard/exchanges/[...slug]',
  '/dashboard/customers',
  '/dashboard/customers/[...slug]',
  '/dashboard/credit-rates',
  '/dashboard/credit-rates/[...slug]',
  '/dashboard/categories',
  '/dashboard/categories/[...slug]',
  '/dashboard/advertisements',
  '/dashboard/advertisements/[...slug]',
  '/dashboard/users',
  '/dashboard/users/[...slug]',
  '/dashboard/roles',
  '/dashboard/roles/[...slug]',
  '/dashboard/posts',
  '/dashboard/posts/[...slug]',
  '/dashboard/service-requests',
  '/dashboard/service-requests/[...slug]',
  '/dashboard/exchange-rates',
  '/dashboard/exchange-rates/[...slug]',
  '/dashboard/billing-address',
  '/dashboard/billing-address/[...slug]',
  '/dashboard/transfer-providers',
  '/dashboard/transfer-providers/[...slug]',
  '/dashboard/exchange-staff',
  '/dashboard/exchange-staff/[...slug]',
  '/dashboard/exchange-quotes',
  '/dashboard/exchange-quotes/[...slug]',
];

/**
 * Routes that require post ownership verification
 * @type {string[]}
 */
export const postOwnershipRoutes = [
  '/dashboard/posts/edit/[id]',
  '/dashboard/posts/delete/[id]',
  '/dashboard/posts/[id]',
];

/**
 * Customer Portal routes — accessible by CUSTOMER / TEST_CUSTOMER / MERCHANT roles
 * @type {string[]}
 */
export const customerRoutes = [
  '/customer',
  '/customer/dashboard',
  '/customer/accounts',
  '/customer/accounts/[id]',
  '/customer/transactions',
  '/customer/transactions/[id]',
  '/customer/kyc',
  '/customer/documents',
  '/customer/profile',
  '/customer/settings',
  '/customer/beneficiaries',
  '/customer/notifications',
  '/customer/developer',
  '/customer/devices',
  '/customer/2fa',
  '/customer/security',
  '/customer/crypto',
  '/customer/wallet',
  '/customer/transfer',
  '/customer/requests',
  '/customer/requests/new',
  '/customer/requests/[id]',
];

/**
 * Get all accessible routes for a specific role
 * @param role User role (OWNER | ADMIN | AUTHOR | CUSTOMER ...)
 * @returns string[] Array of accessible routes
 */
export function getAccessibleRoutes(role: string): string[] {
  const routes = [...baseDashboardRoutes];

  switch (role) {
    case 'OWNER':
      return [...routes, ...superAdminRoutes, ...adminRoutes, ...authorRoutes, ...userFintechRoutes];
    case 'ADMIN':
      return [...routes, ...adminRoutes, ...authorRoutes, ...userFintechRoutes];
    case 'AUTHOR':
      return [...routes, ...authorRoutes, ...userFintechRoutes];
    case 'CUSTOMER':
    case 'TEST_CUSTOMER':
    case 'MERCHANT':
      return customerRoutes;
    default:
      // USER + SUPPORT: base + user-facing fintech surfaces
      return [...routes, ...userFintechRoutes];
  }
}
