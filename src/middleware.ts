import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { apiAuthPrefix, authRoutes, DEFAULT_REDIRECT, publicRoutes } from './routes';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicRoutes = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoutes = authRoutes.includes(nextUrl.pathname);
  const isApiAuthPrefix = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isCronRoute = nextUrl.pathname === '/api/cron'; // Add this line

  if (isApiAuthPrefix) {
    return;
  }

  if (isCronRoute) {
    // Add this block
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    return;
  }

  if (isAuthRoutes) {
    if (isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_REDIRECT, nextUrl));
    }
    return;
  }

  if (!isLoggedIn && !isPublicRoutes) {
    return Response.redirect(new URL('/signin', nextUrl));
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
