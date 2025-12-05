import { NextResponse } from 'next/server';
import { getStats } from '@/actions/postActions';

export async function GET() {
  const result = await getStats();
  
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  
  return NextResponse.json(result.data);
}
