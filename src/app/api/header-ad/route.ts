/**
 * /api/header-ad — REST endpoint برای تبلیغ هدر
 *
 *  GET    → دریافت تبلیغ فعال (public، cached)
 *  POST   → ایجاد تبلیغ جدید (admin only)
 *  PATCH  → به‌روزرسانی تبلیغ (admin only)
 *  DELETE → حذف تبلیغ (admin only)
 *
 *  ۲۰۲۶-۰۶-۱۴: مطابق الگوی api/revalidate و api/settings
 */

import {
  createHeaderAd,
  deleteHeaderAd,
  getActiveHeaderAd,
  toggleHeaderAd,
  updateHeaderAd,
} from '@/actions/headerAdActions';
import { auth } from '@/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Rate limiting for public API
  const xff = request.headers.get('x-forwarded-for');
  const ip =
    (xff
      ? xff
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .at(-1)
      : null) ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';
  const rateLimit = await checkRateLimit(`header-ad:${ip}`, 'api');
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها بیش از حد مجاز است' },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) },
      },
    );
  }

  try {
    const result = await getActiveHeaderAd();
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, error: result.error },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { success: true, data: result.data },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }, // Add caching
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'خطا در دریافت تبلیغ هدر' },
      { status: 500 },
    );
  }
}

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 }) };
  }
  const userRole = (session.user as { role?: string }).role;
  if (!['ADMIN', 'OWNER'].includes(userRole ?? '')) {
    return { error: NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 }) };
  }
  return { session };
}

export async function POST(request: NextRequest) {
  try {
    const guard = await ensureAdmin();
    if (guard.error) return guard.error;

    const body = await request.json();
    const result = await createHeaderAd(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, error: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch {
    return NextResponse.json(
      { success: false, message: 'خطا در ایجاد تبلیغ هدر' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await ensureAdmin();
    if (guard.error) return guard.error;

    const body = (await request.json()) as { id?: string; toggle?: boolean } & Record<
      string,
      unknown
    >;
    if (!body.id) {
      return NextResponse.json(
        { success: false, message: 'شناسه تبلیغ الزامی است' },
        { status: 400 },
      );
    }

    // toggle سریع فقط با id
    if (body.toggle) {
      const result = await toggleHeaderAd(body.id);
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message, error: result.error },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true, data: result.data, message: result.message });
    }

    const { id, toggle: _toggle, ...rest } = body;
    const result = await updateHeaderAd(id as string, rest);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, error: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch {
    return NextResponse.json(
      { success: false, message: 'خطا در به‌روزرسانی تبلیغ هدر' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await ensureAdmin();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'شناسه تبلیغ الزامی است' },
        { status: 400 },
      );
    }

    const result = await deleteHeaderAd(id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, error: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, message: result.message });
  } catch {
    return NextResponse.json({ success: false, message: 'خطا در حذف تبلیغ هدر' }, { status: 500 });
  }
}
