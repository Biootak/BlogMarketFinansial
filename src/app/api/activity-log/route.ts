import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const activities = await db.activityLog.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      userId: activity.userId,
      userEmail: activity.user.email,
      createdAt: activity.createdAt
    }));

    return NextResponse.json({ success: true, data: formattedActivities });
  } catch (error) {
    console.error('[ACTIVITY_LOG_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { action, details } = body;

    const activity = await db.activityLog.create({
      data: {
        action,
        details,
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true, data: activity });
  } catch (error) {
    console.error('[ACTIVITY_LOG_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
