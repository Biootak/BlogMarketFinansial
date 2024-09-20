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
  '/archive/[[...slug]]',
  '/subscription',
  '/single',
  '/_not-found',
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
