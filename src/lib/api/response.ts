/**
 * api/response — سازنده‌های پاسخ استاندارد route handler ها.
 * شکل قرارداد: `{ success: true, data }` یا `{ success: false, error: { code, message } }`.
 */
import { NextResponse } from 'next/server';
import type { z } from 'zod';

/** بدنه‌ی موفق. `data` اختیاری است چون بعضی مسیرها فقط تأیید می‌خواهند. */
export function apiOk<T>(data?: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data === undefined ? { success: true } : { success: true, data }, init);
}

export function apiError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

/** خطای ۵۰۰ برای نتیجه‌ی ناموفق یک عملیات سرور. */
export function apiServerError(message?: string | null): NextResponse {
  return apiError('SERVER', message ?? 'خطای سرور', 500);
}

/**
 * بدنه‌ی JSON را می‌خواند و با schema اعتبارسنجی می‌کند.
 * در صورت خطا، پاسخ آماده‌ی ۴۰۰ برمی‌گردد تا caller فقط آن را return کند.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
  invalidMessage?: string,
): Promise<{ data: z.infer<S>; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: apiError('BAD_BODY', 'بدنه نامعتبر', 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: apiError(
        'VALIDATION',
        invalidMessage ?? parsed.error.issues[0]?.message ?? 'خطای اعتبارسنجی',
        400,
      ),
    };
  }
  return { data: parsed.data as z.infer<S> };
}

/**
 * پاسخ snapshot برای داشبوردهای polling: بدون cache، ۴۰۱ وقتی گارد داخلی رد کرد،
 * و ۵۰۰ با پیام امن در صورت استثنا.
 */
export async function apiSnapshot<T>(
  load: () => Promise<{ success: boolean; data?: T; message?: string }>,
): Promise<NextResponse> {
  try {
    const result = await load();
    if (!result.success) {
      return apiError('UNAUTHORIZED', result.message ?? 'دسترسی ندارید', 401);
    }
    return apiOk(result.data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    return apiError('INTERNAL', err instanceof Error ? err.message : 'خطای ناشناخته', 500);
  }
}
