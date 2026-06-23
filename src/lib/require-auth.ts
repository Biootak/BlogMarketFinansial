// 2026-06-23: server-side auth helper for use in `'use server'` actions.
// Returns a discriminated result instead of `redirect()` so callers can
// produce a structured `{ success: false, error }` response instead of
// the server action crashing with NEXT_REDIRECT. This is the right
// pattern for server actions called from forms: the client renders the
// error and stays on the page, rather than being thrown to a redirect
// destination the user didn't choose.
import { auth } from '@/auth';
import { Role } from '@prisma/client';

export type AuthFailure = {
  success: false;
  status: 401 | 403;
  code: 'UNAUTHENTICATED' | 'FORBIDDEN';
  message: string;
};

export type AuthSuccess<TUser extends { id: string; role: Role } = { id: string; role: Role }> = {
  success: true;
  user: TUser;
};

export type AuthResult = AuthFailure | AuthSuccess;

export async function requireUser(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'برای انجام این عملیات باید وارد حساب کاربری خود شوید.',
    };
  }
  return { success: true, user: session.user as { id: string; role: Role } };
}

export async function requireRole(allowed: Role[]): Promise<AuthResult> {
  const result = await requireUser();
  if (!result.success) return result;
  if (!allowed.includes(result.user.role)) {
    return {
      success: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'شما دسترسی لازم برای انجام این عملیات را ندارید.',
    };
  }
  return result;
}

export async function requireAdmin(): Promise<AuthResult> {
  return requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
}

export async function requireSuperAdmin(): Promise<AuthResult> {
  return requireRole([Role.SUPER_ADMIN]);
}

export async function requireAuthor(): Promise<AuthResult> {
  return requireRole([Role.AUTHOR, Role.ADMIN, Role.SUPER_ADMIN]);
}

// Convert an AuthFailure into the project's standard ActionResult shape.
export function authFailureToActionResult<T>(failure: AuthFailure): {
  success: false;
  message: string;
  error: string;
} {
  return {
    success: false,
    message: failure.message,
    error: failure.code,
  };
}