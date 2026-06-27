import { type NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/actions/categoryActions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get('page') || '1');
  const limit = Number.parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';

  const result = await getCategories({ page, limit, search });

  if (result.success) {
    return NextResponse.json(result.data);
  }
  return NextResponse.json({ error: result.message }, { status: 400 });
}
