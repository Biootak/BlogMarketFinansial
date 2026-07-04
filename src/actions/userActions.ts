'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { hash } from 'bcryptjs';
import type { ActionResult, UserWithProfile } from '@/types/types';
import type { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import { requireUser } from '@/lib/require-auth';
import { auth } from '@/auth';
import { logActivity } from '@/lib/activity-logger';


// 2026-06-23: role hierarchy for ownership/permission checks.
// OWNER (4) > ADMIN (3) > AUTHOR (2) > USER (1).
// A user can mutate another user only if their level is STRICTLY greater.
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  AUTHOR: 2,
  USER: 1,
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
        delete where.role;
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

    return {
      success: true,
      message: 'کاربران با موفقیت بازیابی شدند.',
      data: {
        users,
        totalCount,
      },
    };
  } catch (error) {
    console.error('خطا در بازیابی کاربران:', error);
    return {
      success: false,
      message: 'خطا در بازیابی کاربران. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
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

export async function createUser(data: CreateUserData): Promise<ActionResult<UserWithProfile>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید' };
    }

    const currentUserRole = session.user.role;
// Check if user has permission to create users with the specified role
    if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[data.role]) {
      return { success: false, message: 'شما مجوز ایجاد کاربر با این نقش را ندارید' };
    }

    const hashedPassword = await hash(data.password, 12);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        role: data.role,
        status: data.status,
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
    await logActivity('ایجاد کاربر', `کاربر "${newUser.name || newUser.email}" با نقش "${data.role}" ایجاد شد`);

    return {
      success: true,
      message: 'کاربر با موفقیت ایجاد شد.',
      data: newUser,
    };
  } catch (error) {
    console.error('خطا در ایجاد کاربر:', error);
    return {
      success: false,
      message: 'خطا در ایجاد کاربر. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type UpdateUserData = Partial<CreateUserData>;

export async function updateUser(
  id: string,
  data: UpdateUserData,
): Promise<ActionResult<UserWithProfile>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید' };
    }

    const currentUserRole = session.user.role;
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      return { success: false, message: 'کاربر یافت نشد' };
    }
// Check if user has permission to update this user
    if (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[targetUser.role]) {
      return { success: false, message: 'شما مجوز ویرایش این کاربر را ندارید' };
    }

    // Check if user has permission to assign the new role
    if (data.role && (ROLE_HIERARCHY[currentUserRole] <= ROLE_HIERARCHY[data.role] || (targetUser.id === session.user.id && ROLE_HIERARCHY[data.role] >= ROLE_HIERARCHY[currentUserRole]))) {
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

    return {
      success: true,
      message: 'کاربر با موفقیت به‌روزرسانی شد.',
      data: updatedUser,
    };
  } catch (error) {
    console.error('خطا در به‌روزرسانی کاربر:', error);
    return {
      success: false,
      message: 'خطا در به‌روزرسانی کاربر. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // ثبت فعالیت
    await logActivity('تغییر نقش کاربر', `نقش کاربر "${targetUser.name || targetUser.email}" به "${newRole}" تغییر کرد`);

    return {
      success: true,
      message: 'نقش کاربر با موفقیت به‌روزرسانی شد',
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, message: 'خطا در به‌روزرسانی نقش کاربر' };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'شما باید وارد شوید' };
    }

    const currentUserRole = session.user.role;
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
    console.error('خطا در حذف کاربر:', error);
    return {
      success: false,
      message: 'خطا در حذف کاربر. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
