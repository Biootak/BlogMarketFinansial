'use server';

import { auth } from '@/auth';
import { logActivity } from '@/lib/activity-logger';
import prisma from '@/lib/db';
import { requireAdmin, requireUser } from '@/lib/require-auth';
import { revalidatePath } from '@/lib/revalidate';
import type { ActionResult, UserWithProfile } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { v4 as createId } from 'uuid';
import { z } from 'zod';

// 2026-06-23: role hierarchy for ownership/permission checks.
// OWNER (4) > ADMIN (3) > AUTHOR/SUPPORT (2) > USER (1).
// A user can mutate another user only if their level is STRICTLY greater.
//
// R1/R2-fix (2026-07): SUPERADMIN is kept in the Prisma enum for schema compatibility
// but is treated identically to OWNER at the platform level (level 4).
// Fintech-only roles (CUSTOMER, MERCHANT, EXCHANGE, TEST_CUSTOMER) get level 0 so
// they cannot be managed via the blog/admin dashboard at all.
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  SUPERADMIN: 4, // alias — treated same as OWNER; use OWNER for all new code
  ADMIN: 3,
  SUPPORT: 2,
  AUTHOR: 2,
  USER: 1,
  // fintech roles — not manageable via blog dashboard (level 0 = cannot be target of blog actions)
  TEST_CUSTOMER: 0,
  CUSTOMER: 0,
  MERCHANT: 0,
  EXCHANGE: 0,
};

type GetUsersParams = {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
  role?: string;
};

export async function getUsers({
  limit = 10,
  page = 1,
  search = '',
  status,
  role,
}: GetUsersParams): Promise<ActionResult<{ users: UserWithProfile[]; totalCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید' };
    }

    const currentUserRole = session.user.role;

    // Filter users based on role hierarchy
    const where: Prisma.UserWhereInput = {
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
      status: status && status !== 'All' ? status : undefined,
      role: role && role !== 'All' ? (role as Role) : undefined,
    };

    // Add role-based filtering
    if (currentUserRole !== 'OWNER') {
      if (currentUserRole === 'ADMIN') {
        const requestedRole = where.role;
        where.role = undefined;
        where.AND = [
          { role: { not: { in: [Role.OWNER, Role.ADMIN] } } },
          ...(requestedRole ? [{ role: requestedRole }] : []),
        ];
      } else {
        return { success: false, message: 'شما دسترسی لازم را ندارید' };
      }
    }

    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
        },
        take: limit,
        skip: skip,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Never serialize the password hash to the client.
    const safeUsers = users.map(({ password: _password, ...rest }) => rest);

    return {
      success: true,
      message: 'کاربران با موفقیت بازیابی شدند.',
      data: {
        users: safeUsers,
        totalCount,
      },
    };
  } catch (error) {
    void error; // server errors handled by Next.js error boundary
    return {
      success: false,
      message: 'خطا در بازیابی کاربران. لطفاً دوباره تلاش کنید.',
    };
  }
}

type CreateUserData = {
  name: string;
  email: string;
  phoneNumber?: string;
  role: Role;
  status: string;
  password: string;
};

// Schema for input validation
const createUserInputSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ حرف باشد').max(100),
  email: z
    .string()
    .email('ایمیل نامعتبر است')
    .transform((v) => v.trim().toLowerCase()),
  phoneNumber: z.string().max(20).optional(),
  role: z.nativeEnum(Role),
  status: z.string().min(1),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .max(128, 'رمز عبور بیش از حد طولانی است'),
});

export async function createUser(data: CreateUserData): Promise<ActionResult<UserWithProfile>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return { success: false, message: authCheck.message };

    const currentUserRole = authCheck.user.role;
    // Check if user has permission to create users with the specified role
    if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[data.role]) {
      return { success: false, message: 'شما مجوز ایجاد کاربر با این نقش را ندارید' };
    }

    // Validate input
    const parsed = createUserInputSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? 'ورودی نامعتبر است' };
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    const newUser = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phoneNumber: parsed.data.phoneNumber,
        role: parsed.data.role,
        status: parsed.data.status,
        password: hashedPassword,
        profile: {
          create: {},
        },
      },
      include: {
        profile: true,
      },
    });

    revalidatePath('/users');

    // ثبت فعالیت
    await logActivity(
      'ایجاد کاربر',
      `کاربر "${newUser.name || newUser.email}" با نقش "${data.role}" ایجاد شد`,
    );

    // Never serialize the password hash to the client.
    const { password: _password, ...newUserSafe } = newUser;

    return {
      success: true,
      message: 'کاربر با موفقیت ایجاد شد.',
      data: newUserSafe,
    };
  } catch (error) {
    void error; // server errors handled by Next.js error boundary
    return {
      success: false,
      message: 'خطا در ایجاد کاربر. لطفاً دوباره تلاش کنید.',
    };
  }
}

type UpdateUserData = Partial<CreateUserData>;

export async function updateUser(
  id: string,
  data: UpdateUserData,
): Promise<ActionResult<UserWithProfile>> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return { success: false, message: authCheck.message };

    const currentUserRole = authCheck.user.role;
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      return { success: false, message: 'کاربر یافت نشد' };
    }
    // Check if user has permission to update this user
    if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[targetUser.role]) {
      return { success: false, message: 'شما مجوز ویرایش این کاربر را ندارید' };
    }

    // Check if user has permission to assign the new role
    if (
      data.role &&
      (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[data.role] ||
        (targetUser.id === authCheck.user.id &&
          ROLE_HIERARCHY[data.role] >= ROLE_HIERARCHY[currentUserRole]))
    ) {
      return { success: false, message: 'شما مجوز تغییر به این نقش را ندارید' };
    }

    const updateData: Prisma.UserUpdateInput = {
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: data.role,
      status: data.status,
    };

    if (data.password) {
      updateData.password = await hash(data.password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        profile: true,
      },
    });

    revalidatePath('/users');

    // ثبت فعالیت
    await logActivity('ویرایش کاربر', `کاربر "${updatedUser.name || updatedUser.email}" ویرایش شد`);

    // Never serialize the password hash to the client.
    const { password: _password, ...updatedUserSafe } = updatedUser;

    return {
      success: true,
      message: 'کاربر با موفقیت به‌روزرسانی شد.',
      data: updatedUserSafe,
    };
  } catch (error) {
    void error; // server errors handled by Next.js error boundary
    return {
      success: false,
      message: 'خطا در به‌روزرسانی کاربر. لطفاً دوباره تلاش کنید.',
    };
  }
}

export async function updateUserRole(userId: string, newRole: Role) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید' };
    }

    const currentUserRole = session.user.role;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      return { success: false, message: 'کاربر یافت نشد' };
    }

    // Check role hierarchy
    if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[targetUser.role]) {
      return { success: false, message: 'شما مجوز تغییر نقش این کاربر را ندارید' };
    }

    if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[newRole]) {
      return { success: false, message: 'شما نمی‌توانید این نقش را اعطا کنید' };
    }

    // Increment tokenVersion so the jwt callback detects the role change
    // on the user's next request — instant revocation without forced sign-out.
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole, tokenVersion: { increment: 1 } },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        profile: true,
      },
    });

    // ثبت فعالیت
    await logActivity(
      'تغییر نقش کاربر',
      `نقش کاربر "${targetUser.name || targetUser.email}" به "${newRole}" تغییر کرد`,
    );

    // G9-fix: AuditLog برای تغییر نقش — C10 الزامی (تغییر نقش حساس‌ترین عملیات است)
    await prisma.auditLog.create({
      data: {
        id: createId(),
        exchangeId: 'PLATFORM',
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: userId,
        meta: { prevRole: targetUser.role, newRole } as Prisma.InputJsonValue,
      },
    });

    // Never serialize the password hash to the client (unlike updateUser,
    // this mutation returned the full row incl. `password` before).
    return {
      success: true,
      message: 'نقش کاربر با موفقیت به‌روزرسانی شد',
      data: updatedUser,
    };
  } catch (error) {
    void error; // server errors handled by Next.js error boundary
    return { success: false, message: 'خطا در به‌روزرسانی نقش کاربر' };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.success) return { success: false, message: authCheck.message };

    const currentUserRole = authCheck.user.role;
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      return { success: false, message: 'کاربر یافت نشد' };
    }
    // Check if user has permission to delete this user
    if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[targetUser.role]) {
      return { success: false, message: 'شما مجوز حذف این کاربر را ندارید' };
    }

    const userName = targetUser.name || targetUser.email;

    await prisma.user.delete({
      where: { id },
    });

    revalidatePath('/users');

    // ثبت فعالیت
    await logActivity('حذف کاربر', `کاربر "${userName}" حذف شد`);

    return {
      success: true,
      message: 'کاربر با موفقیت حذف شد.',
    };
  } catch (error) {
    void error; // error logged server-side implicitly
    return {
      success: false,
      message: 'خطا در حذف کاربر. لطفاً دوباره تلاش کنید.',
    };
  }
}
