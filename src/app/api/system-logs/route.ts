import { auth } from '@/auth';
import db from '@/lib/db';
import { dbVariantsFor, isKnownLogLevel, normalizeLogLevel } from '@/lib/log-levels';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * /api/system-logs
 * ─────────────────────────────────────────────────────────────
 *  ۲۰۲۶-۰۸-۰۷ — سه اصلاح:
 *
 *  1. **واژگان سطح** از `@/lib/log-levels` می‌آید. allowlist دستی قبلی
 *     مخلوطی از lower/UPPER بود و `fatal` را اصلاً نمی‌شناخت — یعنی
 *     بحرانی‌ترین سطح، تنها سطحی بود که نمی‌شد ثبت یا فیلتر کرد.
 *
 *  2. **فیلتر منبع** قبلاً یک allowlist شش‌تایی بود
 *     (`api | web | SETUP | ServiceRequest | system | cron`) در حالی که
 *     منابع واقعی `api/auth`, `api/posts`, `cron/rates`, `middleware` هستند.
 *     نتیجه: فیلتر منبع روی دادهٔ واقعی همیشه بی‌اثر بود. allowlist حذف و
 *     با محدودسازی طول و کاراکتر جایگزین شد (Prisma خودش پارامتری است، پس
 *     مسئلهٔ injection نداریم؛ مسئله فقط هزینهٔ کوئری بود).
 *
 *  3. **دسترسی GET** به ADMIN هم باز شد. صفحهٔ `/dashboard/observability`
 *     برای ADMIN باز است ولی این endpoint فقط OWNER را می‌پذیرفت؛ یعنی
 *     ادمین نمودار را می‌دید و با کلیک روی هر ردیف ۴۰۳ می‌گرفت.
 *     نوشتن (POST) همچنان فقط OWNER/SUPERADMIN است.
 */

const READ_ROLES = new Set(['OWNER', 'SUPERADMIN', 'ADMIN']);
const WRITE_ROLES = new Set(['OWNER', 'SUPERADMIN']);

const MAX_TAKE = 200;
const DEFAULT_TAKE = 100;
const SOURCE_RE = /^[\w./:@-]{1,100}$/;

const forbidden = () =>
  NextResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
    { status: 403 },
  );

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت لازم است' } },
        { status: 401 },
      );
    }
    if (!READ_ROLES.has(session.user.role ?? '')) return forbidden();

    const url = new URL(req.url);
    const level = url.searchParams.get('level');
    const source = url.searchParams.get('source');
    const search = url.searchParams.get('search');
    const takeParam = Number.parseInt(url.searchParams.get('take') ?? '', 10);
    const take = Number.isFinite(takeParam)
      ? Math.min(MAX_TAKE, Math.max(1, takeParam))
      : DEFAULT_TAKE;

    const where: Prisma.SystemLogWhereInput = {};

    if (level && level !== 'all' && isKnownLogLevel(level)) {
      // دادهٔ تاریخی هنوز UPPERCASE است؛ همهٔ املاهای همان سطح را می‌گیریم.
      where.level = { in: dbVariantsFor([normalizeLogLevel(level)]) };
    }

    if (source && source !== 'all' && SOURCE_RE.test(source)) {
      where.source = source;
    }

    if (search) {
      where.message = { contains: search.slice(0, 200), mode: 'insensitive' };
    }

    const rows = await db.systemLog.findMany({
      where,
      take,
      orderBy: { timestamp: 'desc' },
    });

    // سطح نرمال‌شده هم برمی‌گردد تا UI مجبور نباشد خودش حدس بزند 'WARNING'
    // یعنی چه، ولی مقدار خام هم برای شفافیت حفظ می‌شود.
    const logs = rows.map((row) => ({
      ...row,
      level: normalizeLogLevel(row.level),
      rawLevel: row.level,
    }));

    return NextResponse.json({ success: true, logs });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطای داخلی سرور' } },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت لازم است' } },
        { status: 401 },
      );
    }
    if (!WRITE_ROLES.has(session.user.role ?? '')) return forbidden();

    const body = (await req.json()) as { level?: unknown; message?: unknown; source?: unknown };
    const { level, message, source } = body;

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'متن پیام الزامی است' } },
        { status: 400 },
      );
    }
    if (typeof level !== 'string' || !isKnownLogLevel(level)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'سطح لاگ نامعتبر است' } },
        { status: 400 },
      );
    }

    const log = await db.systemLog.create({
      data: {
        // همیشه canonical می‌نویسیم؛ واژگان جدید دیگر آلوده نمی‌شود.
        level: normalizeLogLevel(level),
        message: message.slice(0, 2000),
        source: typeof source === 'string' && SOURCE_RE.test(source) ? source : 'api',
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, log });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'خطای داخلی سرور' } },
      { status: 500 },
    );
  }
}
