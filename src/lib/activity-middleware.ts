import { auth } from '@/auth';
import db from '@/lib/db';
import { serverLog } from '@/lib/server-logger';
import type { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// لیست مسیرهایی که باید لاگ شوند
const LOGGED_PATHS = [
  {
    path: '/api/posts',
    methods: ['POST', 'PUT', 'DELETE'],
    action: (method: string) => {
      switch (method) {
        case 'POST':
          return 'ایجاد مطلب جدید';
        case 'PUT':
          return 'ویرایش مطلب';
        case 'DELETE':
          return 'حذف مطلب';
        default:
          return '';
      }
    },
  },
  {
    path: '/api/users',
    methods: ['POST', 'PUT', 'DELETE'],
    action: (method: string) => {
      switch (method) {
        case 'POST':
          return 'ایجاد کاربر جدید';
        case 'PUT':
          return 'ویرایش کاربر';
        case 'DELETE':
          return 'حذف کاربر';
        default:
          return '';
      }
    },
  },
  {
    path: '/api/settings',
    methods: ['POST'],
    action: () => 'به‌روزرسانی تنظیمات',
  },
];

export async function logActivityMiddleware(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return;
    }

    const path = req.nextUrl.pathname;
    const method = req.method;

    // بررسی آیا این مسیر باید لاگ شود
    const logConfig = LOGGED_PATHS.find(
      (config) => path.startsWith(config.path) && config.methods.includes(method),
    );

    if (logConfig) {
      const action = logConfig.action(method);
      if (action) {
        await db.activityLog.create({
          data: {
            action,
            details: `${method} ${path}`,
            userId: session.user.id,
          },
        });
      }
    }
  } catch (error) {
    // Audit logging must not break the request it is auditing, but a missing
    // audit trail is itself a finding — record the failure.
    serverLog.error(
      'activity-middleware',
      `log-activity ${req.method} ${req.nextUrl.pathname}`,
      error,
    );
  }
}

export function withActivityLogging(
  handler: (req: NextRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    await logActivityMiddleware(req);
    return handler(req);
  };
}
