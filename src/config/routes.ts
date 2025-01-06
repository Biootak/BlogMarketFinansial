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
  '/edit-profile',
  '/setup',
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
export const DEFAULT_REDIRECT = '/';

// Routes that require admin access (SUPER_ADMIN or ADMIN)
export const adminRoutes = [
  '/dashboard',
  '/dashboard/users',
  '/dashboard/posts',
  '/dashboard/categories',
  '/dashboard/advertisements',
  '/dashboard/exchange-rates',
  '/dashboard/rate-lists',
  '/dashboard/edit-profile',
];

// Routes that only SUPER_ADMIN can access
export const superAdminRoutes = [
  '/dashboard/settings',
  '/dashboard/reports',
  '/dashboard/*', // This ensures SUPER_ADMIN has access to all dashboard routes
];

// Routes that authors can access
export const authorRoutes = ['/dashboard/posts', '/dashboard/edit-profile'];

// Routes that don't require any special role
export const basicDashboardRoutes = ['/dashboard/edit-profile'];
