import { getArchivePosts } from '@/actions/postActions';
import { type NextRequest, NextResponse } from 'next/server';

// safeCache در postActions پاسخ را ۱۲۰ ثانیه cache می‌کند (در حافظه سرور).
// Cache-Control به مرورگر می‌گوید پاسخ را ۶۰ ثانیه نگه دارد.
// force-dynamic حذف شد — با Cache-Control تضاد داشت و route هیچوقت cache نمی‌شد.

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Pass 2 fix: clamp page like api/categories + api/tags (L2) — NaN,
  // negative or huge page values must not reach the Prisma skip.
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = 15;
  const filter = searchParams.get('filter') || 'همه مقالات';
  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;
  const subcategory = searchParams.get('subcategory') || undefined;
  const _tag = searchParams.get('tag') || undefined;
  const searchQuery = searchParams.get('q') || '';

  const result = await getArchivePosts(
    page,
    limit,
    filter,
    type === 'category' ? category : undefined,
    subcategory,
    type === 'tag' ? category : undefined,
    searchQuery,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { posts, total, pages } = result.data || { posts: [], total: 0, pages: 0 };
  const hasMore = page < pages;

  const res = NextResponse.json({
    data: posts,
    hasMore,
    total,
    pages,
  });

  // SWR مرورگر پاسخ را ۶۰ ثانیه cache می‌کند — revalidate در پس‌زمینه انجام می‌شود.
  // اگر محتوا به‌تازگی تغییر کرده، safeCache در سرور پاسخ تازه می‌دهد.
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  res.headers.set('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  return res;
}
