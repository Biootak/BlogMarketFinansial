'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { hash } from 'bcryptjs';
import type { ActionResult, UserWithProfile } from '@/types/types';
import type { Prisma, Role } from '@prisma/client';

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
    const skip = (page - 1) * limit;

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

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    // ابتدا بررسی می‌کنیم که آیا کاربر وجود دارد
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return {
        success: false,
        message: 'کاربر مورد نظر یافت نشد.',
      };
    }

    // حذف داده‌های وابسته و خود کاربر در یک تراکنش
    await prisma.$transaction(async (prisma) => {
      // حذف SavedPosts
      await prisma.savedPost.deleteMany({ where: { userId: id } });

      // حذف Likes
      await prisma.like.deleteMany({ where: { userId: id } });

      // حذف Comments
      await prisma.comment.deleteMany({ where: { authorId: id } });

      // حذف Posts
      await prisma.post.deleteMany({ where: { authorId: id } });

      // حذف Notifications
      await prisma.notification.deleteMany({ where: { userId: id } });

      // حذف Profile
      await prisma.profile.delete({ where: { userId: id } });

      // حذف Sessions
      await prisma.session.deleteMany({ where: { userId: id } });

      // حذف Accounts
      await prisma.account.deleteMany({ where: { userId: id } });

      // در نهایت، حذف خود کاربر
      await prisma.user.delete({ where: { id } });
    });

    revalidatePath('/users');

    return {
      success: true,
      message: 'کاربر و تمام داده‌های مرتبط با موفقیت حذف شدند.',
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

// اضافه کردن یک تابع جدید برای بازیابی یک کاربر خاص
export async function getUser(id: string): Promise<ActionResult<UserWithProfile>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'کاربر مورد نظر یافت نشد.',
      };
    }

    return {
      success: true,
      message: 'کاربر با موفقیت بازیابی شد.',
      data: user,
    };
  } catch (error) {
    console.error('خطا در بازیابی کاربر:', error);
    return {
      success: false,
      message: 'خطا در بازیابی کاربر. لطفاً دوباره تلاش کنید.',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
