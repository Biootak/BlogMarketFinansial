'use server';

import prisma from '@/lib/db';
import { authFailureToActionResult, requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { ActionResult } from '@/types/types';
import { TaskPriority, TaskStatus } from '@prisma/client';
import type { Task } from '@prisma/client';
import { z } from 'zod';

// Zod schemas — centralised input validation for task mutations.
const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'عنوان تسک الزامی است')
    .max(200, 'عنوان نباید بیشتر از ۲۰۰ کاراکتر باشد')
    .trim(),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
});

const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(TaskStatus),
});

const deleteTaskSchema = z.object({
  id: z.string().min(1),
});

export async function getTasks(limit = 10): Promise<ActionResult<Task[]>> {
  const auth = await requireUser();
  if (!auth.success) return authFailureToActionResult(auth);

  try {
    const tasks = await prisma.task.findMany({
      where: { userId: auth.user.id },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
      take: Math.min(limit, 100),
    });
    return { success: true, data: tasks, message: '' };
  } catch {
    return {
      success: false,
      message: 'خطا در دریافت تسک‌ها. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}

export async function createTask(data: {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
}): Promise<ActionResult<Task>> {
  const auth = await requireUser();
  if (!auth.success) return authFailureToActionResult(auth);

  const parsed = createTaskSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message ?? 'داده نامعتبر',
      error: 'INVALID_INPUT',
    };
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate,
        priority: parsed.data.priority ?? 'MEDIUM',
        userId: auth.user.id,
      },
    });

    revalidateTag('tasks');
    return { success: true, data: task, message: 'تسک با موفقیت ایجاد شد.' };
  } catch {
    return {
      success: false,
      message: 'خطا در ایجاد تسک. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<ActionResult<Task>> {
  const auth = await requireUser();
  if (!auth.success) return authFailureToActionResult(auth);

  const parsed = updateStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.errors[0]?.message ?? 'داده نامعتبر',
      error: 'INVALID_INPUT',
    };
  }

  try {
    const updated = await prisma.task.update({
      where: { id: parsed.data.id, userId: auth.user.id },
      data: { status: parsed.data.status },
    });

    revalidateTag('tasks');
    return { success: true, data: updated, message: 'وضعیت تسک با موفقیت بروزرسانی شد.' };
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return {
        success: false,
        message: 'تسک یافت نشد.',
        error: 'NOT_FOUND',
      };
    }
    return {
      success: false,
      message: 'خطا در بروزرسانی وضعیت تسک. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}

export async function deleteTask(id: string): Promise<ActionResult<void>> {
  const auth = await requireUser();
  if (!auth.success) return authFailureToActionResult(auth);

  const parsed = deleteTaskSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      success: false,
      message: 'شناسه تسک نامعتبر است.',
      error: 'INVALID_INPUT',
    };
  }

  try {
    await prisma.task.delete({
      where: { id: parsed.data.id, userId: auth.user.id },
    });

    revalidateTag('tasks');
    return { success: true, data: undefined, message: 'تسک با موفقیت حذف شد.' };
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return {
        success: false,
        message: 'تسک یافت نشد.',
        error: 'NOT_FOUND',
      };
    }
    return {
      success: false,
      message: 'خطا در حذف تسک. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    };
  }
}
