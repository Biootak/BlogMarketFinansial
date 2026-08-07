'use server';

import { auth } from '@/auth';
import db from '@/lib/db';
import { serverLog } from '@/lib/server-logger';

export async function logActivity(action: string, details: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // کاربر لاگین نیست — لاگ بدون userId ممکن نیست؛ silent skip
      return;
    }

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action,
        details,
      },
    });
  } catch (error) {
    // نباید مسیر اصلی را بلاک کند — best-effort
    serverLog.error('activity-logger', 'logActivity', error);
  }
}
