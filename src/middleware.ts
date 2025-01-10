import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  DEFAULT_REDIRECT,
  apiAuthPrefix,
  publicRoutes,
  authRoutes,
  authorRoutes,
  postOwnershipRoutes,
  adminRoutes,
  superAdminRoutes,
  basicDashboardRoutes,
} from './config/routes';
import authConfig from './auth.config';
import { PrismaClient } from '@prisma/client';

const { auth } = NextAuth(authConfig);
const prisma = new PrismaClient();

const logger = {
  debug: (message: string, ...args: any[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};

/**
 * مسیرهای API که نیاز به دسترسی ادمین دارند
 */
const adminApiRoutes = [
  '/api/system-reports',
  '/api/users',
  '/api/categories',
  '/api/settings',
];

/**
 * مسیرهای API که نیاز به دسترسی نویسنده دارند
 */
const authorApiRoutes = [
  '/api/posts',
  '/api/comments',
  '/api/categories', // اضافه کردن دسترسی به دسته‌بندی‌ها
];

/**
 * چک کردن دسترسی به API
 */
const checkApiAccess = (pathname: string, role?: string) => {
  logger.debug('Checking API access:', { pathname, role });

  if (!role) {
    logger.debug('No role provided for API access');
    return false;
  }

  // دسترسی کامل برای سوپر ادمین
  if (role === 'SUPER_ADMIN') {
    return true;
  }

  // دسترسی ادمین
  if (role === 'ADMIN' && adminApiRoutes.some(route => pathname.startsWith(route))) {
    return true;
  }

  // دسترسی نویسنده
  if (role === 'AUTHOR' && authorApiRoutes.some(route => pathname.startsWith(route))) {
    return true;
  }

  return false;
};

/**
 * چک کردن دسترسی به مسیر
 */
const hasPathAccess = (pathname: string, allowedPaths: string[]) => {
  logger.debug('Checking path access:', { pathname, allowedPaths });

  return allowedPaths.some(path => {
    if (path.includes('[')) {
      const basePath = path.split('[')[0];
      return pathname.startsWith(basePath);
    }
    return pathname === path;
  });
};

/**
 * چک کردن دسترسی به داشبورد
 */
const checkDashboardAccess = (pathname: string, role?: string) => {
  logger.debug('Checking dashboard access:', { pathname, role });

  if (basicDashboardRoutes.includes(pathname)) {
    logger.debug('Basic dashboard route access granted');
    return true;
  }

  if (!role) {
    logger.debug('No role provided, access denied');
    return false;
  }

  let hasAccess = false;
  switch (role) {
    case 'SUPER_ADMIN':
      hasAccess = true;
      break;
    case 'ADMIN':
      hasAccess = hasPathAccess(pathname, adminRoutes);
      break;
    case 'AUTHOR':
      hasAccess = hasPathAccess(pathname, authorRoutes);
      break;
    default:
      hasAccess = false;
  }

  logger.debug('Dashboard access check result:', { role, pathname, hasAccess });
  return hasAccess;
};

export default auth(async (req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  
  // دریافت توکن از درخواست
  const token = await getToken({ 
    req,
    secret: process.env.AUTH_SECRET
  });
  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;
  const userId = token?.sub;

  logger.debug('Middleware request:', {
    pathname,
    isLoggedIn,
    role,
    userId,
    search: nextUrl.search
  });

  // بررسی مسیرهای API
  if (pathname.startsWith('/api')) {
    // مسیرهای auth نیاز به بررسی ندارند
    if (pathname.startsWith(apiAuthPrefix)) {
      logger.debug('Auth API route, skipping check');
      return NextResponse.next();
    }

    // بررسی دسترسی به API
    if (!isLoggedIn) {
      logger.debug('API access denied: not logged in');
      return new NextResponse(
        JSON.stringify({ error: 'لطفا وارد حساب کاربری خود شوید' }),
        { status: 401 }
      );
    }

    const hasApiAccess = checkApiAccess(pathname, role);
    if (!hasApiAccess) {
      logger.debug('API access denied:', { pathname, role });
      return new NextResponse(
        JSON.stringify({ error: 'شما دسترسی لازم برای این عملیات را ندارید' }),
        { status: 403 }
      );
    }

    logger.debug('API access granted');
    return NextResponse.next();
  }

  // بررسی مسیرهای عمومی
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    logger.debug('Public route access granted:', pathname);
    return NextResponse.next();
  }

  // بررسی مسیرهای احراز هویت
  if (authRoutes.includes(pathname)) {
    if (isLoggedIn) {
      logger.debug('Authenticated user redirected from auth route');
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
    }
    logger.debug('Auth route access granted');
    return NextResponse.next();
  }

  // اجبار به لاگین برای مسیرهای محافظت شده
  if (!isLoggedIn) {
    logger.debug('Unauthenticated user redirected to login');
    const callbackUrl = encodeURIComponent(pathname + nextUrl.search);
    return NextResponse.redirect(new URL(`/signin?callbackUrl=${callbackUrl}`, nextUrl));
  }

  // کنترل دسترسی به مسیرهای داشبورد
  if (pathname.startsWith('/dashboard')) {
    logger.debug('Checking dashboard route access');
    
    const hasAccess = checkDashboardAccess(pathname, role);
    logger.debug('Dashboard access check result:', { hasAccess, role, pathname });

    if (!hasAccess) {
      let redirectUrl = '/';
      switch (role) {
        case 'AUTHOR':
          redirectUrl = '/dashboard/posts';
          break;
        case 'ADMIN':
          redirectUrl = '/dashboard';
          break;
      }
      logger.debug('Dashboard access denied, redirecting to:', redirectUrl);
      return NextResponse.redirect(new URL(redirectUrl, nextUrl));
    }

    // بررسی مالکیت پست برای مسیرهای خاص
    if (role === 'AUTHOR' && postOwnershipRoutes.some(route => pathname.startsWith(route))) {
      const postId = nextUrl.searchParams.get('id');
      
      if (!postId) {
        logger.debug('No post ID provided for ownership check');
        return NextResponse.redirect(new URL('/dashboard/posts', nextUrl));
      }

      try {
        const post = await prisma.post.findUnique({
          where: { 
            id: postId,
            authorId: userId 
          },
        });

        if (!post) {
          logger.debug('Post ownership check failed:', { postId, userId });
          return NextResponse.redirect(new URL('/dashboard/posts', nextUrl));
        }
        
        logger.debug('Post ownership verified:', { postId, userId });
      } catch (error) {
        logger.error('Error checking post ownership:', error);
        return NextResponse.redirect(new URL('/dashboard/posts', nextUrl));
      }
    }
  }

  logger.debug('Access granted');
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
