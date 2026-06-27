'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function getNotifications() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!session?.user?.id) {
      return [];
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user?.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return notifications.map((notification) => ({
      ...notification,
      time: notification.createdAt.toLocaleString('fa-IR'),
    }));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching notifications:', error);
    }
    return [];
  }
}
