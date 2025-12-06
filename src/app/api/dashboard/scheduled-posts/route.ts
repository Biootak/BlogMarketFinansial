import { getScheduledPosts } from '@/actions/postActions';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await getScheduledPosts();

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
