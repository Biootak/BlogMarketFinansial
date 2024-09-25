import NextAuth from 'next-auth';
import authConfig from './auth.config';
import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_REDIRECT,
  publicRoutes,
  adminRoutes,
} from './config/routes';

const { auth } = NextAuth(authConfig);

// Helper function to check if a path matches a route pattern
function matchRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => {
    // For simple routes, use direct comparison
    if (!route.includes('[') && !route.includes(']')) {
      return path === route;
    }
    // For dynamic routes, use a regex
    const pattern = route.replace(/\[\[\.\.\..*?\]\]/g, '.*').replace(/\[.*?\]/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicRoute = matchRoute(nextUrl.pathname, publicRoutes);
  const isAuthRoute = matchRoute(nextUrl.pathname, authRoutes);
  const isApiAuthPrefix = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isAdminRoute = matchRoute(nextUrl.pathname, adminRoutes);

  if (isApiAuthPrefix) {
    return;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
    }
    return;
  }

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL('/signin', nextUrl));
  }

  // Check user role for admin routes
  if (isAdminRoute && req.auth?.user?.role !== 'ADMIN' && req.auth?.user?.role !== 'AUTHOR') {
    console.log(`Unauthorized admin access attempt by user ${req.auth?.user?.id}`);
    return Response.redirect(new URL('/unauthorized', nextUrl));
  }
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
