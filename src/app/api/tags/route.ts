import { type NextRequest, NextResponse } from 'next/server';
import { getTags } from '@/actions/getTags';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get('page') || '1');
  const limit = Number.parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';

  const result = await getTags({ page, limit, search });

  if (result.success) {
    return NextResponse.json(result.data);
  }
  return NextResponse.json({ error: result.message }, { status: 400 });
}
