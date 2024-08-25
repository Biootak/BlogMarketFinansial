'use server';

import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function getNotifications() {
  const session = await auth();
  const user = session?.user;

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
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
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}
