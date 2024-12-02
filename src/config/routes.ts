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
];

/**
 * Routes related to authentication
 * @type {string[]}
 */
export const authRoutes = ['/signin', '/signup', '/error', '/verify-request']

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
  '/dashboard/users',
  '/dashboard/categories',
  '/dashboard/advertisements',
  '/dashboard/exchange-rates',
  '/dashboard/rate-lists'
];

// Routes that require author access (AUTHOR, ADMIN, SUPER_ADMIN)
export const authorRoutes = [
  '/dashboard/posts',
  '/dashboard/posts/*',
  '/dashboard/edit-profile'
];

// Routes that don't require any special role
export const basicDashboardRoutes = [
  '/dashboard/edit-profile'
];
