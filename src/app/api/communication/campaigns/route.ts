import { auth } from '@/auth';
import { createCampaign } from '@/lib/communication';
/**
 * POST /api/communication/campaigns
 * ایجاد کمپین جدید (email/sms/push).
 *
 * Body:
 *  - name: string (required)
 *  - description?: string
 *  - channel: 'email' | 'sms' | 'push' (required)
 *  - subject?: string  (required if channel === 'email')
 *  - body: string (required)
 *  - audience: 'all' | 'role' | 'segment' (default: 'all')
 *  - audienceFilter?: string
 *  - scheduledAt?: ISO string
 *  - status?: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' (default: 'draft')
 */
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  name: z.string().min(1, 'نام الزامی است').max(200),
  description: z.string().max(1000).nullable().optional(),
  channel: z.enum(['email', 'sms', 'push']),
  subject: z.string().max(150).nullable().optional(),
  body: z.string().min(1, 'متن الزامی است').max(10_000),
  audience: z.enum(['all', 'role', 'segment']).default('all'),
  audienceFilter: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'completed', 'paused']).default('draft'),
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
  const p = parsed.data;
  if (p.channel === 'email' && !p.subject?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION', message: 'برای کمپین ایمیلی، موضوع الزامی است' },
      },
      { status: 400 },
    );
  }
  const result = await createCampaign({
    name: p.name,
    description: p.description ?? null,
    channel: p.channel,
    subject: p.subject ?? null,
    body: p.body,
    audience: p.audience,
    audienceFilter: p.audienceFilter ?? null,
    scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
    status: p.status,
  });
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER', message: result.message ?? 'خطای سرور' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true, data: { id: result.id } });
}
