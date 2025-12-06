/**
 * Performance Metrics API
 * ذخیره و دریافت performance metrics
 */

import prisma from '@/lib/db';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { route, metricType, value, metadata } = body;

    // ذخیره metric در دیتابیس
    await prisma.performanceMetric.create({
      data: {
        route,
        metricType,
        value,
        metadata,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving performance metric:', error);
    return NextResponse.json({ error: 'Failed to save metric' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const route = searchParams.get('route');
    const metricType = searchParams.get('metricType');
    const limit = Number.parseInt(searchParams.get('limit') || '100');

    const where: any = {};
    if (route) where.route = route;
    if (metricType) where.metricType = metricType;

    const metrics = await prisma.performanceMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
