import { NextResponse } from 'next/server';
import { getViewStats } from '@/actions/getViewStats';

export async function GET() {
  const result = await getViewStats();
  
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  
  return NextResponse.json(result.data);
}
