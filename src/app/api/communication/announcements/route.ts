import { auth } from '@/auth';
import { createAnnouncement } from '@/lib/communication';
/**
 * POST /api/communication/announcements
 * ایجاد اعلان جدید از داشبورد.
 *
 * Body:
 *  - title: string (required)
 *  - body: string (required)
 *  - channels: ('inapp' | 'email' | 'push' | 'sms')[] (required, min 1)
 *  - audience: 'all' | 'role' | 'segment' (default: 'all')
 *  - audienceFilter?: string
 *  - scheduledAt?: ISO string
 *  - expiresAt?: ISO string
 *  - status?: 'draft' | 'scheduled' | 'published' | 'archived' (default: 'draft')
 */
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است').max(200),
  body: z.string().min(1, 'متن الزامی است').max(5000),
  channels: z.array(z.enum(['inapp', 'email', 'push', 'sms'])).min(1, 'حداقل یک کانال انتخاب کنید'),
  audience: z.enum(['all', 'role', 'segment']).default('all'),
  audienceFilter: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'احراز هویت نشده‌اید' } },
      { status: 401 },
    );
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی ندارید' } },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_BODY', message: 'بدنه نامعتبر' } },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION',
          message: parsed.error.issues[0]?.message ?? 'خطای اعتبارسنجی',
        },
      },
      { status: 400 },
    );
  }

  const result = await createAnnouncement({
    title: parsed.data.title,
    body: parsed.data.body,
    channels: parsed.data.channels,
    audience: parsed.data.audience,
    audienceFilter: parsed.data.audienceFilter ?? null,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    status: parsed.data.status,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { id: result.id } });
}
