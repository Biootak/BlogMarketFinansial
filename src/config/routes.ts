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
  '/money-transfer',
  '/money-transfer/[...slug]',
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
  '/[[...slug]]',
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
export const baseDashboardRoutes = ['/dashboard', '/dashboard/edit-profile'];

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
 * Routes that only SUPER_ADMIN can access
 * @type {string[]}
 */
export const superAdminRoutes = [
  '/dashboard/settings',
  '/dashboard/settings/[...slug]',
  '/dashboard/reports',
  '/dashboard/reports/[...slug]',
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
 * Get all accessible routes for a specific role
 * @param role User role (SUPER_ADMIN | ADMIN | AUTHOR)
 * @returns string[] Array of accessible routes
 */
export function getAccessibleRoutes(role: string): string[] {
  const routes = [...baseDashboardRoutes];

  switch (role) {
    case 'SUPER_ADMIN':
      return [...routes, ...superAdminRoutes, ...adminRoutes, ...authorRoutes];
    case 'ADMIN':
      return [...routes, ...adminRoutes, ...authorRoutes];
    case 'AUTHOR':
      return [...routes, ...authorRoutes];
    default:
      return routes;
  }
}
