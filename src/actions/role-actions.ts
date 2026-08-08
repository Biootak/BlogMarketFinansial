'use server';

/**
 * role-actions — مدیریت نقش‌های پلتفرم
 *
 * - getRoleStats: آمار تعداد کاربران برای هر نقش + وضعیت سیستم
 * - getUsersByRole: لیست کاربران یک نقش خاص با pagination
 * - updateUserRole: تغییر نقش کاربر با بررسی hierarchy
 *
 * امنیت: فقط ADMIN/OWNER/SUPERADMIN — hierarchy check اجباری
 */

import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/require-auth';
import { revalidatePath } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';
import { Role } from '@prisma/client';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// ─── Hierarchy ────────────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  SUPERADMIN: 4,
  ADMIN: 3,
  SUPPORT: 2,
  AUTHOR: 2,
  USER: 1,
  CUSTOMER: 0,
  MERCHANT: 0,
  EXCHANGE: 0,
  TEST_CUSTOMER: 0,
};

/** نقش‌هایی که در داشبورد platform مدیریت می‌شوند */
const PLATFORM_ROLES: Role[] = [
  Role.USER,
  Role.AUTHOR,
  Role.SUPPORT,
  Role.ADMIN,
  Role.OWNER,
  Role.SUPERADMIN,
];

/** نقش‌هایی که قابل تغییر هستند (OWNER/SUPERADMIN فقط از طریق DB مستقیم) */
const ASSIGNABLE_ROLES: Role[] = [Role.USER, Role.AUTHOR, Role.SUPPORT, Role.ADMIN];

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoleStat = {
  role: Role;
  count: number;
  activeCount: number;
  hierarchy: number;
  assignable: boolean;
};

export type RoleUserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  status: string;
  createdAt: Date;
};

// ─── GET ROLE STATS ───────────────────────────────────────────────────────────

export async function getRoleStats(): Promise<FintechActionResult<{ stats: RoleStat[] }>> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const counts = await prisma.user.groupBy({
    by: ['role', 'status'],
    _count: { _all: true },
    where: { role: { in: PLATFORM_ROLES } },
  });

  const statMap: Record<string, { total: number; active: number }> = {};
  for (const row of counts) {
    if (!statMap[row.role]) statMap[row.role] = { total: 0, active: 0 };
    const entry = statMap[row.role];
    if (entry) {
      entry.total += row._count._all;
      if (row.status === 'ACTIVE') entry.active += row._count._all;
    }
  }

  const stats: RoleStat[] = PLATFORM_ROLES.map((role) => ({
    role,
    count: statMap[role]?.total ?? 0,
    activeCount: statMap[role]?.active ?? 0,
    hierarchy: ROLE_HIERARCHY[role],
    assignable: ASSIGNABLE_ROLES.includes(role),
  }));

  return { success: true, data: { stats } };
}

// ─── GET USERS BY ROLE ────────────────────────────────────────────────────────

const GetUsersSchema = z.object({
  role: z.nativeEnum(Role),
  page: z.number().int().min(1).default(1),
  search: z.string().max(100).optional(),
});

export async function getUsersByRole(
  raw: unknown,
): Promise<
  FintechActionResult<{ users: RoleUserRow[]; total: number; page: number; pages: number }>
> {
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const parsed = GetUsersSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'پارامترهای نامعتبر' } };
  }

  const { role, page, search } = parsed.data;

  // مالک کاملاً از کاربران جدا است: ردیف‌های OWNER/SUPERADMIN فقط برای
  // OWNER/SUPERADMIN قابل مشاهده‌اند — ADMIN/SUPPORT نباید حتی لیست
  // مالک‌ها (ایمیل/نام) را ببینند.
  if (
    (role === Role.OWNER || role === Role.SUPERADMIN) &&
    auth.user.role !== Role.OWNER &&
    auth.user.role !== Role.SUPERADMIN
  ) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'شما اجازه‌ی مشاهده‌ی این نقش را ندارید' },
    };
  }

  const limit = 12;
  const skip = (page - 1) * limit;

  const where = {
    role,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    success: true,
    data: {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        status: u.status,
        createdAt: u.createdAt,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// ─── UPDATE USER ROLE ─────────────────────────────────────────────────────────

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  newRole: z.nativeEnum(Role),
});

export async function updateUserRole(
  raw: unknown,
): Promise<FintechActionResult<{ id: string; role: Role }>> {
  // ADMIN می‌تواند فقط به USER/AUTHOR/SUPPORT تغییر دهد — OWNER برای ADMIN/OWNER
  const auth = await requireAdmin();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const parsed = UpdateRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'داده نامعتبر' } };
  }

  const { userId, newRole } = parsed.data;

  if (userId === auth.user.id) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'نمی‌توانید نقش خودتان را تغییر دهید' },
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'کاربر یافت نشد' } };
  }

  const actorLevel = ROLE_HIERARCHY[auth.user.role];
  const targetCurrentLevel = ROLE_HIERARCHY[target.role];
  const targetNewLevel = ROLE_HIERARCHY[newRole];

  // نمی‌توان به کسی با سطح مساوی یا بالاتر دسترسی داد
  if (targetCurrentLevel >= actorLevel) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'شما نمی‌توانید نقش این کاربر را تغییر دهید' },
    };
  }
  if (targetNewLevel >= actorLevel) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'نمی‌توانید نقش بالاتر از خودتان را اعطا کنید' },
    };
  }

  // Increment tokenVersion so any active sessions for this user immediately
  // pick up the new role on their next request (via the jwt callback check).
  // This is the Auth.js v5 / 2026 pattern for instant role invalidation
  // without forcing a sign-out — the session stays alive but the role is
  // refreshed within one request rather than after up to 24 h (updateAge).
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole, tokenVersion: { increment: 1 } },
    select: { id: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      id: createId(),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: userId,
      meta: { from: target.role, to: newRole },
    },
  });

  revalidatePath('/dashboard/roles');
  revalidatePath('/dashboard/users');

  return { success: true, data: { id: updated.id, role: updated.role } };
}
