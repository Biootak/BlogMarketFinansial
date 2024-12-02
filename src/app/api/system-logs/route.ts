import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const logs = await db.systemLog.findMany({
      take: 100, // محدود کردن به 100 لاگ آخر
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
