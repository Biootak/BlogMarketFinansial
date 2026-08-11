// Auth helper for server actions — returns discriminated result instead of redirect()
// so callers can return { success: false, error } without crashing with NEXT_REDIRECT.
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
  // R1/R2-fix: SUPERADMIN treated identically to OWNER across all auth checks
  return requireRole([Role.ADMIN, Role.OWNER, Role.SUPERADMIN]);
}

export async function requireSuperAdmin(): Promise<AuthResult> {
  // OWNER only. SUPERADMIN is an elevated ADMIN, not an OWNER alias: it must
  // NOT reach owner-level surfaces (site settings, reports).
  return requireRole([Role.OWNER]);
}

export async function requireAuthor(): Promise<AuthResult> {
  // R1/R2-fix: SUPERADMIN treated identically to OWNER — must match checkAuthor() in auth.ts
  return requireRole([Role.AUTHOR, Role.ADMIN, Role.OWNER, Role.SUPERADMIN]);
}

import { permissionMatches } from '@/lib/dashboard-sections';

const PLATFORM_ROLES = new Set<Role>(['OWNER', 'SUPERADMIN', 'ADMIN', 'SUPPORT']);

const permissionDenied = (key: string): AuthResult => ({
  success: false,
  status: 403,
  code: 'FORBIDDEN',
  message: `شما دسترسی «${key}» ندارید.`,
});
// ─── Permission-level RBAC (دانه‌ای) ─────────────────────────────────────────
// 2026-08-11 (v2): semantic تغییر کرد تا اجرای واقعی بدون شکستن رفتار فعلی
// ممکن شود:
//   - کاربر بدون override (grants/denies خالی) → گارد نقشِ بالادست (requireAdmin
//     و همتاها) حاکم است؛ اینجا فقط مطمئن می‌شویم نقش پلتفرمی است.
//   - کاربر با override → استثناهای کاربری اعمال می‌شود: deny مقدم است و در
//     حالت whitelist فقط کلیدهای grant پذیرفته می‌شوند.
//   - تطبیق سطح اکشن: `kyc` روی `kyc:approve` اثر دارد؛ `kyc:approve` دقیقاً
//     همان اکشن را می‌سنجد (مثلاً «فقط تأیید KYC بدون مشتریان»).
export async function requirePermission(permissionKey: string): Promise<AuthResult> {
  const userResult = await requireUser();
  if (!userResult.success) return userResult;

  const user = userResult.user as {
    role: Role;
    permissions?: string[];
    deniedPermissions?: string[];
  };
  const grants = user.permissions ?? [];
  const denies = user.deniedPermissions ?? [];
  const hasOverrides = grants.length > 0 || denies.length > 0;

  if (!hasOverrides) {
    // بدون override کاربری، گارد نقشِ بالادست حاکم است؛ فقط مطمئن می‌شویم
    // نقش، پلتفرمی است (USER/CUSTOMER و … نمی‌توانند از اینجا عبور کنند).
    if (PLATFORM_ROLES.has(user.role)) return userResult;
    return permissionDenied(permissionKey);
  }

  if (denies.some((d) => permissionMatches(permissionKey, d))) {
    return permissionDenied(permissionKey);
  }
  if (grants.length > 0 && !grants.some((g) => permissionMatches(permissionKey, g))) {
    return permissionDenied(permissionKey);
  }

  return userResult;
}

/** نسخهٔ boolean — برای پاس دادن پرچم دسترسی به UI (نمایش/مخفی‌کردن دکمه). */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  const result = await requirePermission(permissionKey);
  return result.success;
}

// Convert an AuthFailure into the project's standard ActionResult shape.
export function authFailureToActionResult<_T>(failure: AuthFailure): {
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
