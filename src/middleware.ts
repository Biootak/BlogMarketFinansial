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
