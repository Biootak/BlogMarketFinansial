/**
 * Public routes that are accessible without authentication
 * @type {string[]}
 */
export const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/search',
  '/archive',
  '/[[...slug]]',
  '/subscription',
  '/single',
  '/_not-found',
  '/money-transfer',
  '/online-payment',
];

/**
 * Routes related to authentication
 * @type {string[]}
 */
export const authRoutes = ['/signin', '/signup', '/error', '/verify-request'];

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
 * Routes that require admin access (SUPER_ADMIN or ADMIN)
 * @type {string[]}
 */
export const adminRoutes = [
  '/dashboard',
  '/dashboard/users',
  '/dashboard/advertisements',
  '/dashboard/exchange-rates',
  '/dashboard/rate-lists',
  '/dashboard/reports',
  '/dashboard/statistics',
];

/**
 * Routes that only SUPER_ADMIN can access
 * @type {string[]}
 */
export const superAdminRoutes = [
  '/dashboard/settings',
];

/**
 * Routes that require author access
 * @type {string[]}
 */
export const authorRoutes = [
  '/dashboard/posts',
  '/dashboard/create-post',
  '/dashboard/edit-post',
  '/dashboard/delete-post',
  '/dashboard/categories', // اضافه کردن دسترسی به صفحه دسته‌بندی‌ها
];

/**
 * Routes that require post ownership verification
 * @type {string[]}
 */
export const postOwnershipRoutes = [
  '/dashboard/edit-post',
  '/dashboard/delete-post',
];

/**
 * Routes that don't require any special role
 * @type {string[]}
 */
export const basicDashboardRoutes = [
  '/dashboard/edit-profile',
];
