import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const settings = await db.systemSettings.findFirst();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('[SETTINGS_GET]', error);
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
    const {
      siteName,
      siteDescription,
      maintenanceMode,
      cacheEnabled,
      smtpServer,
      smtpPort,
      smtpUsername,
      smtpPassword,
      telegram,
      instagram,
      twitter,
    } = body;

    // Get existing settings or create new
    let settings = await db.systemSettings.findFirst();
    
    if (settings) {
      settings = await db.systemSettings.update({
        where: { id: settings.id },
        data: {
          siteName,
          siteDescription,
          maintenanceMode,
          cacheEnabled,
          smtpServer,
          smtpPort,
          smtpUsername,
          smtpPassword,
          telegram,
          instagram,
          twitter,
        },
      });
    } else {
      settings = await db.systemSettings.create({
        data: {
          siteName,
          siteDescription,
          maintenanceMode,
          cacheEnabled,
          smtpServer,
          smtpPort,
          smtpUsername,
          smtpPassword,
          telegram,
          instagram,
          twitter,
        },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('[SETTINGS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
