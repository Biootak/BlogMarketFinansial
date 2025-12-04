import prisma from '@/lib/db';
import { type NextRequest, NextResponse } from 'next/server';

// Rate limiting ساده برای جلوگیری از spam
const viewCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // حداکثر 100 بازدید
const RATE_WINDOW = 60 * 1000; // در هر دقیقه

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = viewCounts.get(ip);

  if (!record || now > record.resetTime) {
    viewCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { page } = await req.json();

    if (!page || typeof page !== 'string') {
      return NextResponse.json({ error: 'Page URL is required' }, { status: 400 });
    }

    // Sanitize page URL
    const sanitizedPage = page.slice(0, 500).replace(/[<>'"]/g, '');

    // پیدا کردن یا ایجاد رکورد pageview
    const existingPageView = await prisma.pageView.findFirst({
      where: { page: sanitizedPage },
    });

    let pageView;
    if (existingPageView) {
      pageView = await prisma.pageView.update({
        where: { id: existingPageView.id },
        data: { views: { increment: 1 } },
      });
    } else {
      pageView = await prisma.pageView.create({
        data: { page: sanitizedPage, views: 1 },
      });
    }

    return NextResponse.json({ success: true, views: pageView.views });
  } catch (error) {
    console.error('Error recording page view:', error);
    return NextResponse.json({ error: 'Failed to record page view' }, { status: 500 });
  }
}
