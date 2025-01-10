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
 * Routes that require admin access (ADMIN)
 * @type {string[]}
 */
export const adminRoutes = [
  '/dashboard',
  '/dashboard/users',
  '/dashboard/advertisements',
  '/dashboard/exchange-rates',
  '/dashboard/rate-lists',
];

/**
 * Routes that only SUPER_ADMIN can access
 * @type {string[]}
 */
export const superAdminRoutes = [
  '/dashboard/settings',
  '/dashboard/reports',
  '/dashboard/statistics',
  '/dashboard/system',
  '/dashboard/system/logs',
  '/dashboard/system/performance',
  '/dashboard/system/backup',
  '/dashboard/system/updates',
];

/**
 * Routes that require author access
 * @type {string[]}
 */
export const authorRoutes = [
  '/dashboard',
  '/dashboard/posts',
  '/dashboard/posts/create',
  '/dashboard/posts/edit',
  '/dashboard/posts/edit/[id]',
  '/dashboard/posts/delete',
  '/dashboard/posts/delete/[id]',
  '/dashboard/posts/preview',
  '/dashboard/posts/preview/[id]',
  '/dashboard/posts/schedule',
  '/dashboard/posts/schedule/[id]',
  '/dashboard/posts/publish',
  '/dashboard/posts/publish/[id]',
  '/dashboard/create-post',
  '/dashboard/edit-post',
  '/dashboard/delete-post',
  '/dashboard/categories',
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
