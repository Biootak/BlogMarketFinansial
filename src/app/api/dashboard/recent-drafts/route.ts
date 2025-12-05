import { NextResponse } from 'next/server';
import { getRecentDrafts } from '@/actions/getRecentDrafts';

export async function GET() {
  const result = await getRecentDrafts();
  
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  
  return NextResponse.json(result.data);
}
