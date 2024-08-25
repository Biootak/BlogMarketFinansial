import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { apiAuthPrefix, authRoutes, DEFAULT_REDIRECT, publicRoutes } from './routes';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // تغییر در نحوه بررسی مسیرهای عمومی
  const isPublicRoute = publicRoutes.some((route) => {
    if (route.includes('[[...') || route.includes('[...')) {
      // برای مسیرهای داینامیک، بررسی می‌کنیم آیا URL با بخش ثابت مسیر شروع می‌شود
      const baseRoute = route.split('[')[0];
      return nextUrl.pathname.startsWith(baseRoute);
    }
    // برای مسیرهای ثابت، بررسی دقیق انجام می‌دهیم
    return nextUrl.pathname === route;
  });

  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isApiAuthPrefix = nextUrl.pathname.startsWith(apiAuthPrefix);

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
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
