'use server'

import { requireUser, authFailureToActionResult } from '@/lib/require-auth'
import prisma from '@/lib/db'
import { revalidateTag } from '@/lib/revalidate'
import type { Task, TaskStatus, TaskPriority } from '@prisma/client'
import type { ActionResult } from '@/types/types'

export async function getTasks(limit = 10): Promise<ActionResult<Task[]>> {
  const auth = await requireUser()
  if (!auth.success) return authFailureToActionResult(auth)

  try {
    const tasks = await prisma.task.findMany({
      where: { userId: auth.user.id },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: limit,
    })
    return { success: true, data: tasks, message: '' }
  } catch (error) {
    console.error('[taskActions] Error fetching tasks:', error)
    return {
      success: false,
      message: 'خطا در دریافت تسک‌ها. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    }
  }
}

export async function createTask(data: {
  title: string
  description?: string
  dueDate?: Date
  priority?: TaskPriority
}): Promise<ActionResult<Task>> {
  const auth = await requireUser()
  if (!auth.success) return authFailureToActionResult(auth)

  if (!data.title?.trim()) {
    return {
      success: false,
      message: 'عنوان تسک الزامی است.',
      error: 'INVALID_INPUT',
    }
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority || 'MEDIUM',
        userId: auth.user.id,
      },
    })

    revalidateTag('tasks')
    return { success: true, data: task, message: 'تسک با موفقیت ایجاد شد.' }
  } catch (error) {
    console.error('[taskActions] Error creating task:', error)
    return {
      success: false,
      message: 'خطا در ایجاد تسک. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    }
  }
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<ActionResult<Task>> {
  const auth = await requireUser()
  if (!auth.success) return authFailureToActionResult(auth)

  try {
    const updated = await prisma.task.update({
      where: { id, userId: auth.user.id },
      data: { status },
    })

    revalidateTag('tasks')
    return { success: true, data: updated, message: 'وضعیت تسک با موفقیت بروزرسانی شد.' }
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return {
        success: false,
        message: 'تسک یافت نشد.',
        error: 'NOT_FOUND',
      }
    }
    console.error('[taskActions] Error updating task status:', error)
    return {
      success: false,
      message: 'خطا در بروزرسانی وضعیت تسک. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    }
  }
}

export async function deleteTask(id: string): Promise<ActionResult<void>> {
  const auth = await requireUser()
  if (!auth.success) return authFailureToActionResult(auth)

  try {
    await prisma.task.delete({
      where: { id, userId: auth.user.id },
    })

    revalidateTag('tasks')
    return { success: true, data: undefined, message: 'تسک با موفقیت حذف شد.' }
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return {
        success: false,
        message: 'تسک یافت نشد.',
        error: 'NOT_FOUND',
      }
    }
    console.error('[taskActions] Error deleting task:', error)
    return {
      success: false,
      message: 'خطا در حذف تسک. لطفاً دوباره تلاش کنید.',
      error: 'INTERNAL_ERROR',
    }
  }
}
