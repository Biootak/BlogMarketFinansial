import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import {
  DEFAULT_REDIRECT,
  apiAuthPrefix,
  publicRoutes,
  authRoutes,
} from './config/routes';
import authConfig from './auth.config';
import { PrismaClient } from '@prisma/client';

const { auth } = NextAuth(authConfig);
const prisma = new PrismaClient();

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // محافظت از مسیر setup
  if (nextUrl.pathname.startsWith('/setup')) {
    try {
      // بررسی وجود سوپر ادمین
      const existingAdmin = await prisma.user.findFirst({
        where: {
          role: 'SUPER_ADMIN',
        },
      });

      // اگر سوپر ادمین وجود داشت، ریدایرکت به صفحه اصلی
      if (existingAdmin) {
        return NextResponse.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
      }

      // اگر سوپر ادمین وجود نداشت و در محیط تولید هستیم
      if (process.env.NODE_ENV === 'production') {
        // بررسی IP کاربر
        const clientIp = (req.headers.get('x-forwarded-for') || req.ip || 'unknown').toString();
        const allowedIps = process.env.ALLOWED_SETUP_IPS?.split(',') || [];
        
        // اگر IP کاربر در لیست مجاز نبود، ریدایرکت به صفحه اصلی
        if (!allowedIps.includes(clientIp)) {
          console.log(`Unauthorized setup access attempt from IP: ${clientIp}`);
          return NextResponse.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
        }
      }
    } catch (error) {
      console.error('Error in setup middleware:', error);
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
    }
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
