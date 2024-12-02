import { NextResponse } from 'next/server';
import { auth } from '@/auth';

import os from 'os';
import db from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // اطلاعات CPU
    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
    // در سیستم‌عامل ویندوز دمای CPU در دسترس نیست
    const cpuTemp = 45; // مقدار نمونه

    // اطلاعات حافظه
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // اطلاعات دیسک (مقادیر نمونه)
    const diskInfo = {
      total: 500 * 1024 * 1024 * 1024, // 500GB
      used: 250 * 1024 * 1024 * 1024,  // 250GB
      free: 250 * 1024 * 1024 * 1024   // 250GB
    };

    // بررسی وضعیت دیتابیس
    let dbStatus = 'online';
    let dbConnections = 0;
    let queryTime = 0;

    try {
      const startTime = Date.now();
      await db.$queryRaw`SELECT 1`;
      queryTime = Date.now() - startTime;
      
      const connectionInfo = await db.$queryRaw`SELECT count(*) as count FROM pg_stat_activity`;
      dbConnections = (connectionInfo as any)[0].count;
    } catch (error) {
      dbStatus = 'error';
      console.error('Database check error:', error);
    }

    // وضعیت کش (مقادیر نمونه)
    const cacheStatus = {
      status: 'online' as const,
      hitRate: 85
    };

    const systemStatus = {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        temperature: cpuTemp
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem
      },
      disk: diskInfo,
      database: {
        status: dbStatus as 'online' | 'offline' | 'error',
        connections: dbConnections,
        queryTime
      },
      cache: cacheStatus,
      lastUpdate: new Date().toISOString()
    };

    return NextResponse.json({ success: true, data: systemStatus });
  } catch (error) {
    console.error('[SYSTEM_STATUS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
