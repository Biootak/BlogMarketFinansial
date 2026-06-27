'use server';

import { auth } from '@/auth';
import db from '@/lib/db';

export async function logActivity(action: string, details: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('کاربر احراز هویت نشده است');
    }

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action,
        details,
      },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
