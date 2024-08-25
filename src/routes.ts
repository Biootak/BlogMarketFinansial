/**
 * any routes that are public and should be accessible without authentication
 * @type {string[]}
 */
export const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/search ',
  '/archive',
  '/subscription',
  '/single',
  '/single/[[...slug]]',
  '/_not-found ',
];
/**
 * any routes that are protected and should be accessible only if the user is authenticated
 * @type {string[]}
 */
export const authRoutes = ['/signin', '/signup', '/error', '/verify-request'];
/**
 * The API routes are all prefixed with `/api/auth` to avoid collisions
 * with the NextAuth.js API routes.
 *@type {string}
 */
export const apiAuthPrefix = '/api/auth';
/**
 * The API routes are all prefixed with `/api/auth` to avoid collisions
 * with the NextAuth.js API routes.
 *@type {string}
 */
export const DEFAULT_REDIRECT = '/';
