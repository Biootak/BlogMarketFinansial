import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';

/**
 * GET /api/system-logs
 * 
 * Returns a list of system logs.
 * 
 * Query Parameters:
 * - level: Filter by log level (all, debug, info, warn, error)
 * - source: Filter by log source (all, api, web, etc.)
 * - search: Search for logs containing the specified string
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const source = url.searchParams.get('source');
    const search = url.searchParams.get('search');

    const where: any = {};
    
    if (level && level !== 'all') {
      where.level = level;
    }
    
    if (source && source !== 'all') {
      where.source = source;
    }
    
    if (search) {
      where.message = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const logs = await db.systemLog.findMany({
      where,
      take: 100,
      orderBy: {
        timestamp: 'desc'
      }
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('[SYSTEM_LOGS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { level, message, source } = body;

    const log = await db.systemLog.create({
      data: {
        level,
        message,
        source,
        timestamp: new Date()
      }
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    console.error('[SYSTEM_LOGS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
