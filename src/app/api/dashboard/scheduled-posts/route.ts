import { NextResponse } from 'next/server';
import { getScheduledPosts } from '@/actions/postActions';

export async function GET() {
  const result = await getScheduledPosts();
  
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  
  return NextResponse.json(result.data);
}
