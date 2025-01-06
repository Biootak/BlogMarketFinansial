import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import {
  DEFAULT_REDIRECT,
  apiAuthPrefix,
  publicRoutes,
  authRoutes,
} from './config/routes';
import authConfig from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // محافظت از مسیر setup در محیط تولید
  if (nextUrl.pathname.startsWith('/setup')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
    // در محیط توسعه اجازه دسترسی داده می‌شود
    return;
  }

  // اگر مسیر API settings است و کاربر SUPER_ADMIN نیست، دسترسی رد شود
  if (nextUrl.pathname.startsWith('/api/settings')) {
    if (!isLoggedIn || req.auth?.user?.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  // Handle API auth routes
  if (nextUrl.pathname.startsWith(apiAuthPrefix)) {
    return;
  }

  // Handle public routes
  if (publicRoutes.some(route => nextUrl.pathname.startsWith(route))) {
    return;
  }

  // Handle auth routes (login/register)
  if (authRoutes.some(route => nextUrl.pathname.startsWith(route))) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
    }
    return;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', nextUrl));
  }

  // Allow access to all authenticated users
  return;
});

// این مسیرها نیاز به بررسی ندارند
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
