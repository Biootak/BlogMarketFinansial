import { getTags } from '@/actions/getTags';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1') || 1);
  // L2 fix: clamp limit to bound query cost (prevent DoS via huge limit).
  const rawLimit = Number.parseInt(searchParams.get('limit') || '20');
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20));
  const search = searchParams.get('search') || '';

  const result = await getTags({ page, limit, search });

  if (result.success) {
    return NextResponse.json(result.data);
  }
  return NextResponse.json({ error: result.message }, { status: 400 });
}
