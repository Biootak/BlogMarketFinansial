import prisma from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";



export async function POST(req: NextRequest) {
  try {
    const { page } = await req.json();

    if (!page) {
      return NextResponse.json({ error: 'Page URL is required' }, { status: 400 });
    }

    const pageView = await prisma.pageView.create({
      data: {
        page,
        views: 1,
      },
    });

    return NextResponse.json({ success: true, pageView });
  } catch (error) {
    console.error('Error recording page view:', error);
    return NextResponse.json({ error: 'Failed to record page view' }, { status: 500 });
  }
}
