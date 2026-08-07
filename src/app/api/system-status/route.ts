import { auth } from '@/auth';
import db from '@/lib/db';
import { checkDiskSpace, getSystemMetrics } from '@/lib/system';
import { NextResponse } from 'next/server';

const STATUS_ROLES = new Set(['OWNER', 'SUPERADMIN']);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !STATUS_ROLES.has(session.user.role ?? '')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
        { status: 403 },
      );
    }

    // Get cached system metrics
    const systemInfo = await getSystemMetrics();

    // Get disk space info
    try {
      // Use path.parse to safely extract drive root on Windows; on Linux/macOS cwd() is used directly
      const cwd = process.cwd();
      const diskRoot = process.platform === 'win32' ? (cwd.split('\\')[0] ?? cwd) : cwd;
      // Validate diskRoot to prevent path traversal
      if (typeof diskRoot !== 'string' || diskRoot.includes('..') || diskRoot.includes('\0')) {
        throw new Error('Invalid disk path');
      }
      const diskSpace = await checkDiskSpace(diskRoot);
      if (diskSpace) {
        systemInfo.disk = {
          total: diskSpace.size,
          free: diskSpace.free,
          used: diskSpace.size - diskSpace.free,
          usagePercentage: Math.round(((diskSpace.size - diskSpace.free) / diskSpace.size) * 100),
        };
      }
    } catch {
      systemInfo.disk = {
        total: 0,
        free: 0,
        used: 0,
        usagePercentage: 0,
      };
    }

    // Check database status
    let dbStatus = {
      status: 'offline',
      connections: 0,
      responseTime: 0,
    };

    try {
      const startTime = Date.now();
      await db.$queryRaw`SELECT 1`;
      const endTime = Date.now();

      // $queryRaw returns typed rows; $executeRaw returns affected-row count.
      // For the pg_stat_activity count we need $queryRaw so we get the actual
      // BigInt value, then convert to Number for JSON serialisation.
      const countResult = await db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM pg_stat_activity
      `;
      dbStatus = {
        status: 'online',
        connections: Number(countResult[0]?.count ?? 0),
        responseTime: endTime - startTime,
      };
    } catch {
      // dbStatus stays offline — safe default
    }

    // Get application stats
    let appStats = {
      users: 0,
      posts: 0,
      comments: 0,
      environment: process.env.NODE_ENV || 'development',
    };

    try {
      const [users, posts, comments] = await Promise.all([
        db.user.count(),
        db.post.count(),
        db.comment.count(),
      ]);

      appStats = {
        users,
        posts,
        comments,
        environment: process.env.NODE_ENV || 'development',
      };
    } catch {
      // appStats stays at zero defaults — safe
    }

    return NextResponse.json({
      success: true,
      data: {
        system: systemInfo,
        database: dbStatus,
        application: appStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'خطای داخلی سرور' },
      },
      { status: 500 },
    );
  }
}
