import { auth } from '@/auth';
import db from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

// Allowlisted log levels and sources to prevent injection / enumeration attacks.
const ALLOWED_LEVELS = new Set([
  'debug',
  'info',
  'warn',
  'error',
  'INFO',
  'WARN',
  'ERROR',
  'DEBUG',
]);
const ALLOWED_SOURCES = new Set(['api', 'web', 'SETUP', 'ServiceRequest', 'system', 'cron']);

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
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Unauthorized access' }, { status: 403 });
    }

    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const source = url.searchParams.get('source');
    const search = url.searchParams.get('search');

    const where: Prisma.SystemLogWhereInput = {};

    if (level && level !== 'all' && ALLOWED_LEVELS.has(level)) {
      where.level = level;
    }

    if (source && source !== 'all' && ALLOWED_SOURCES.has(source)) {
      where.source = source;
    }

    if (search) {
      // Limit search string length to prevent excessive query cost
      const sanitizedSearch = search.slice(0, 200);
      where.message = {
        contains: sanitizedSearch,
        mode: 'insensitive',
      };
    }

    const logs = await db.systemLog.findMany({
      where,
      take: 100,
      orderBy: {
        timestamp: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('[SYSTEM_LOGS_GET]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json({ success: false, error: 'Unauthorized access' }, { status: 403 });
    }

    const body = await req.json();
    const { level, message, source } = body;

    // Validate required fields and types
    if (typeof level !== 'string' || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } },
        { status: 400 },
      );
    }

    if (!ALLOWED_LEVELS.has(level)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid log level' } },
        { status: 400 },
      );
    }

    const log = await db.systemLog.create({
      data: {
        level,
        message: message.slice(0, 2000),
        source: typeof source === 'string' ? source.slice(0, 100) : 'api',
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('[SYSTEM_LOGS_POST]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
