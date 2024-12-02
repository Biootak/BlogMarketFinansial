import NextAuth from 'next-auth';

import { NextResponse } from 'next/server';
import {
  DEFAULT_REDIRECT,
  apiAuthPrefix,
  publicRoutes,
  authRoutes,
  adminRoutes,
} from './config/routes';
import authConfig from './auth.config';

const { auth } = NextAuth(authConfig);

// Helper function to check if a path matches a route pattern
function matchRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (route.includes('*')) {
      const baseRoute = route.replace('*', '');
      return path.startsWith(baseRoute);
    }
    return path === route;
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
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
    }
    return;
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/signin', nextUrl));
  }

  // اگر کاربر لاگین شده اما نقش او 'USER' است، او را به صفحه ورود هدایت کنید
  if (isLoggedIn && req.auth?.user?.role === 'USER') {
    console.log('User session is invalid. Redirecting to signin.');
    return NextResponse.redirect(new URL('/signin', nextUrl));
  }

  // Check user role for admin routes
  if (isAdminRoute) {
    const userRole = req.auth?.user?.role;
    
    // SUPER_ADMIN has access to everything
    if (userRole === 'SUPER_ADMIN') {
      return;
    }
    
    // Redirect normal users away from dashboard
    if (userRole === 'USER' && nextUrl.pathname.startsWith('/dashboard')) {
      console.log('User attempting to access dashboard');
      return NextResponse.redirect(new URL('/', nextUrl));
    }

    // Handle AUTHOR role - only allow access to posts management and profile
    if (userRole === 'AUTHOR') {
      const allowedPaths = ['/dashboard/posts', '/dashboard/edit-profile', '/dashboard/edit-profile'];
      const isAllowedPath = allowedPaths.some(path => nextUrl.pathname.startsWith(path));
      
      if (!isAllowedPath) {
        console.log(`Author attempting to access restricted route: ${nextUrl.pathname}`);
        return NextResponse.redirect(new URL('/dashboard/posts', nextUrl));
      }
      return;
    }

    // Handle ADMIN role
    if (userRole === 'ADMIN') {
      // Admin can't access super-admin routes
      const restrictedPaths = ['/dashboard/super-admin'];
      const isRestrictedPath = restrictedPaths.some(path => nextUrl.pathname.startsWith(path));
      
      if (isRestrictedPath) {
        console.log(`Admin attempting to access super-admin route: ${nextUrl.pathname}`);
        return NextResponse.redirect(new URL('/unauthorized', nextUrl));
      }
      return;
    }

    // If not SUPER_ADMIN, ADMIN, or AUTHOR, redirect to unauthorized
    if (!['SUPER_ADMIN', 'ADMIN', 'AUTHOR'].includes(userRole as string)) {
      console.log(`Unauthorized admin access attempt by user ${req.auth?.user?.id} with role ${userRole}`);
      return NextResponse.redirect(new URL('/unauthorized', nextUrl));
    }
  }
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
