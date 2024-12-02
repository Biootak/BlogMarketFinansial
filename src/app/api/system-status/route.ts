import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import os from 'os';
import db from '@/lib/db';

export async function GET() {
  try {
    // بررسی احراز هویت
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // اطلاعات سیستم
    let systemInfo = {};
    try {
      const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      systemInfo = {
        cpu: {
          usage: Math.round(cpuUsage * 100) / 100,
          temperature: process.platform === 'win32' ? null : 45 // فقط مقدار نمونه برای غیر ویندوز
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercentage: Math.round((usedMem / totalMem) * 100)
        },
        os: {
          platform: process.platform,
          version: os.release(),
          uptime: os.uptime()
        }
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      systemInfo = { error: 'Failed to get system information' };
    }

    // اطلاعات دیتابیس
    let dbInfo = {};
    try {
      const startTime = Date.now();
      await db.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - startTime;

      const [{ count }] = await db.$queryRaw`
        SELECT COUNT(*) as count 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      dbInfo = {
        status: 'online',
        connections: Number(count),
        responseTime: queryTime,
        version: await db.$queryRaw`SELECT version()`
      };
    } catch (error) {
      console.error('Database check error:', error);
      dbInfo = {
        status: 'error',
        error: 'Failed to connect to database'
      };
    }

    // اطلاعات اپلیکیشن
    let appInfo = {};
    try {
      const [
        usersCount,
        postsCount,
        commentsCount
      ] = await Promise.all([
        db.user.count(),
        db.post.count(),
        db.comment.count()
      ]);

      appInfo = {
        users: usersCount,
        posts: postsCount,
        comments: commentsCount,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      };
    } catch (error) {
      console.error('App info error:', error);
      appInfo = { error: 'Failed to get application information' };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        system: systemInfo,
        database: dbInfo,
        application: appInfo
      }
    });

  } catch (error) {
    console.error('[SYSTEM_STATUS_GET]', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
