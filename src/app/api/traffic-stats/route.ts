import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Mock database or data source
const mockDatabase = {
  getTrafficStats: async () => {
    // Simulate database query delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const data = last7Days.map(() => Math.floor(Math.random() * 1000));
    const totalViews = data.reduce((sum, views) => sum + views, 0);
    const todayViews = data[data.length - 1];

    return {
      labels: last7Days,
      data,
      totalViews,
      todayViews,
    };
  },
};

export async function GET() {
  try {
    // چک احراز هویت
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const trafficStats = await mockDatabase.getTrafficStats();
    return NextResponse.json(trafficStats);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch traffic statistics' }, { status: 500 });
  }
}
