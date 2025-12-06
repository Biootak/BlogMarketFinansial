import { getViewStats } from '@/actions/getViewStats';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await getViewStats();

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'خطا در دریافت آمار' }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
