'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { requireUser } from '@/lib/require-auth';
import { revalidateTag } from '@/lib/revalidate';
import type { FintechActionResult } from '@/types/types';

export type NotificationRow = {
  id: number;
  message: string;
  userId: string;
  isRead: boolean;
  createdAt: Date;
  time: string;
};

export async function getNotifications(opts?: {
  limit?: number;
  offset?: number;
}): Promise<NotificationRow[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 20,
      skip: opts?.offset ?? 0,
    });

    return notifications.map((n) => ({
      id: n.id,
      message: n.message,
      userId: n.userId,
      isRead: n.isRead,
      createdAt: n.createdAt,
      time: n.createdAt.toLocaleString('fa-IR'),
    }));
  } catch {
    return [];
  }
}

/**
 * تعداد اعلان‌های خوانده‌نشده — برای sidebar badge
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) return 0;
    return prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    });
  } catch {
    return 0;
  }
}

export async function getNotificationsCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) return 0;
    return prisma.notification.count({ where: { userId: session.user.id } });
  } catch {
    return 0;
  }
}

/**
 * علامت‌گذاری همه اعلان‌ها به عنوان خوانده‌شده
 */
export async function markAllNotificationsRead(): Promise<FintechActionResult<{ updated: number }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const result = await prisma.notification.updateMany({
    where: { userId: auth.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidateTag('notifications');
  return { success: true, data: { updated: result.count } };
}

/**
 * علامت‌گذاری یک اعلان به عنوان خوانده‌شده
 */
export async function markNotificationRead(id: number): Promise<FintechActionResult<{ id: number }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  await prisma.notification.updateMany({
    where: { id, userId: auth.user.id },
    data: { isRead: true },
  });

  revalidateTag('notifications');
  return { success: true, data: { id } };
}

/**
 * ایجاد اعلان جدید — برای استفاده در Server Actions دیگر
 */
export async function createNotification(
  userId: string,
  message: string,
): Promise<void> {
  await prisma.notification.create({
    data: { message, userId },
  });
}

/**
 * حذف همه اعلان‌های کاربر جاری
 */
export async function clearNotifications(): Promise<FintechActionResult<{ deleted: number }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  const { count } = await prisma.notification.deleteMany({
    where: { userId: auth.user.id },
  });

  revalidateTag('notifications');
  return { success: true, data: { deleted: count } };
}

/**
 * حذف یک اعلان خاص
 */
export async function deleteNotification(id: number): Promise<FintechActionResult<{ id: number }>> {
  const auth = await requireUser();
  if (!auth.success) {
    return { success: false, error: { code: auth.code, message: auth.message } };
  }

  // فقط اعلان‌های خودِ کاربر
  await prisma.notification.deleteMany({
    where: { id, userId: auth.user.id },
  });

  revalidateTag('notifications');
  return { success: true, data: { id } };
}
