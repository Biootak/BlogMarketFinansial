import { auth } from '@/auth';
import db from '@/lib/db';
import { checkDiskSpace, getSystemMetrics } from '@/lib/system';
import { NextResponse } from 'next/server';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized access' }, { status: 401 });
    }

    // Get cached system metrics
    const systemInfo = await getSystemMetrics();

    // Get disk space info
    try {
      const diskSpace = await checkDiskSpace(process.cwd().split('\\')[0]);
      if (diskSpace) {
        systemInfo.disk = {
          total: diskSpace.size,
          free: diskSpace.free,
          used: diskSpace.size - diskSpace.free,
          usagePercentage: Math.round(((diskSpace.size - diskSpace.free) / diskSpace.size) * 100),
        };
      }
    } catch (diskError) {
      console.error('Error getting disk space:', diskError);
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

      dbStatus = {
        status: 'online',
        connections: await db.$executeRaw`SELECT COUNT(*) FROM pg_stat_activity`,
        responseTime: endTime - startTime,
      };
    } catch (dbError) {
      console.error('Database check error:', dbError);
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
    } catch (statsError) {
      console.error('Error getting application stats:', statsError);
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
  } catch (error) {
    console.error('System status API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}
