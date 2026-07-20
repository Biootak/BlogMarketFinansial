import { auth } from '@/auth';
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
        { status: 403 },
      );
    }

    const activities = await db.activityLog.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      userId: activity.userId,
      userEmail: activity.user.email,
      createdAt: activity.createdAt,
    }));

    return NextResponse.json({ success: true, data: formattedActivities });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'خطای داخلی سرور' } },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    if (!['ADMIN', 'OWNER'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { action, details } = body;

    if (!action || typeof action !== 'string' || !details || typeof details !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } },
        { status: 400 },
      );
    }

    const activity = await db.activityLog.create({
      data: {
        action,
        details,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: activity });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Error' } },
      { status: 500 },
    );
  }
}
